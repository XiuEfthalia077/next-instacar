import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { manilaToday } from "@/lib/datetime";
import { ACTIVE_CAR_STATUSES, OPEN_BOOKING_STATUSES } from "@/lib/data/legacy-status";
import { BUCKETS, carImageUrl } from "@/lib/storage";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "instacar_messenger_verify_token_2026";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";
const PUBLIC_AVAILABILITY_URL = "https://instacar.vercel.app/availability";
const DISPATCH_PHONE = "0917 554 0394";

/**
 * First-offer discount configuration (empty by default).
 * Example to enable: { Sedan: 100, Hatchback: 50 }
 */
export const FIRST_OFFER_DISCOUNT_BY_TYPE: Record<string, number> = {};

export interface BookingSession {
  step: "AWAITING_CAR" | "AWAITING_FORM" | "AWAITING_CONFIRMATION" | "BOOKED";
  bookingId?: number;
  startDate?: string;
  endDate?: string;
  pickupTime?: string;
  returnTime?: string;
  carId?: number;
  carName?: string;
  carPrice?: number;
  branchId?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  fulfillmentType?: "Pickup" | "Delivery";
  deliveryAddress?: string;
  rentalType?: "Self-Drive" | "With Driver";
  totalPrice?: number;
  primaryIdPath?: string;
  proofBillingPath?: string;
  secondaryIdPath?: string;
  proofPaymentPath?: string;
  lastQuotedPricePerDay?: number;
  lastQuotedCarId?: number;
}

export interface CarAvailabilityInfo {
  car: {
    id: number;
    brand: string | null;
    model: string | null;
    displayName: string;
    type: string | null;
    transmission: string | null;
    color: string | null;
    capacity: number | null;
    fuel_type: string | null;
    image_path: string | null;
    image_url: string | null;
    price_24_hours: number | null;
    branch_id: number | null;
    status: string;
  };
  isAvailable: boolean;
  conflictReason?: string;
  conflictRange?: { start: string; end: string };
}

// ---------------------------------------------------------------------------
// Session persistence in contact_messages table
// ---------------------------------------------------------------------------
async function getSession(psid: string): Promise<BookingSession | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from("contact_messages")
      .select("message")
      .eq("name", `fb_session_${psid}`)
      .eq("subject", "messenger_booking_state")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.message) return null;
    return JSON.parse(data.message) as BookingSession;
  } catch {
    return null;
  }
}

async function saveSession(psid: string, session: BookingSession | null) {
  const supabase = getAdminClient();
  if (!supabase) return;

  try {
    if (!session) {
      await supabase
        .from("contact_messages")
        .delete()
        .eq("name", `fb_session_${psid}`)
        .eq("subject", "messenger_booking_state");
      return;
    }

    const { data: existing } = await supabase
      .from("contact_messages")
      .select("id")
      .eq("name", `fb_session_${psid}`)
      .eq("subject", "messenger_booking_state")
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("contact_messages")
        .update({
          message: JSON.stringify(session),
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("contact_messages").insert({
        name: `fb_session_${psid}`,
        email: "messenger@instacar.ph",
        subject: "messenger_booking_state",
        message: JSON.stringify(session),
        is_read: true,
      });
    }
  } catch (err) {
    console.error("[Session Save Error]:", err);
  }
}

// ---------------------------------------------------------------------------
// Price Decision Engine & Sanitization
// ---------------------------------------------------------------------------
export function sanitizePriceWording(text: string, allowDiscountWords: boolean): string {
  if (allowDiscountWords) return text;
  let sanitized = text;
  sanitized = sanitized.replace(
    /since you(?:'ll| will)? rent for multiple days[,\s]*discounted rate/gi,
    "the rate remains the same",
  );
  sanitized = sanitized.replace(/\b(discounted|discount|promo|special rate)\b/gi, "standard rate");
  return sanitized;
}

export interface PriceDecision {
  comparison: "SAME" | "LOWER" | "HIGHER" | "FIRST_OFFER";
  priceText: string;
  allowDiscountWords: boolean;
  quotedPricePerDay: number;
}

export function decidePriceWording(
  lastPricePerDay: number | undefined | null,
  newPricePerDay: number,
  days: number = 1,
  carType?: string | null,
  isFirstQuote: boolean = false,
): PriceDecision {
  const safeDays = Math.max(1, days);
  const total = newPricePerDay * safeDays;
  const daysLabel = `${safeDays} day${safeDays > 1 ? "s" : ""}`;
  const mathText = `${daysLabel} x ₱${newPricePerDay.toLocaleString()} = ₱${total.toLocaleString()}`;

  // First offer check
  const typeKey = Object.keys(FIRST_OFFER_DISCOUNT_BY_TYPE).find(
    (k) => k.toLowerCase() === (carType || "").toLowerCase(),
  );
  const discountAmount = typeKey ? FIRST_OFFER_DISCOUNT_BY_TYPE[typeKey] : 0;

  if (isFirstQuote && discountAmount > 0 && newPricePerDay > discountAmount) {
    const discountedRate = newPricePerDay - discountAmount;
    const discountedTotal = discountedRate * safeDays;
    return {
      comparison: "FIRST_OFFER",
      priceText: `We can give it at ₱${discountedRate.toLocaleString()} instead of ₱${newPricePerDay.toLocaleString()} per 24 hours (self-drive).\n \n${safeDays} day${safeDays > 1 ? "s" : ""} x ₱${discountedRate.toLocaleString()} = ₱${discountedTotal.toLocaleString()}`,
      allowDiscountWords: true,
      quotedPricePerDay: discountedRate,
    };
  }

  if (lastPricePerDay === undefined || lastPricePerDay === null) {
    return {
      comparison: "SAME",
      priceText: `Rate: ₱${newPricePerDay.toLocaleString()} per 24 hours (self-drive).\n \nTotal: ${mathText}`,
      allowDiscountWords: false,
      quotedPricePerDay: newPricePerDay,
    };
  }

  if (newPricePerDay === lastPricePerDay) {
    return {
      comparison: "SAME",
      priceText: `For ${daysLabel} Ma'am/Sir, the rate remains ₱${newPricePerDay.toLocaleString()} per day po 😊\n \nTotal: ${mathText}`,
      allowDiscountWords: false,
      quotedPricePerDay: newPricePerDay,
    };
  } else if (newPricePerDay < lastPricePerDay) {
    return {
      comparison: "LOWER",
      priceText: `Good news! Since longer rental, we can give you ₱${newPricePerDay.toLocaleString()} per day instead of ₱${lastPricePerDay.toLocaleString()}.\n \nTotal: ${mathText}`,
      allowDiscountWords: true,
      quotedPricePerDay: newPricePerDay,
    };
  } else {
    return {
      comparison: "HIGHER",
      priceText: `The rate for this option is ₱${newPricePerDay.toLocaleString()} per 24 hours (different vehicle class or dates).\n \nTotal: ${mathText}`,
      allowDiscountWords: false,
      quotedPricePerDay: newPricePerDay,
    };
  }
}

// ---------------------------------------------------------------------------
// Messenger Formatting & Splitting
// ---------------------------------------------------------------------------
export function formatForMessenger(text: string): string {
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Strip bold asterisks
    .replace(/\*(.*?)\*/g, "$1") // Strip italic asterisks
    .replace(/^#{1,6}\s+/gm, "") // Strip markdown headings
    .replace(/\r\n/g, "\n");

  // Messenger trims truly empty lines. Using a line with a single space preserves the paragraph gap.
  formatted = formatted.replace(/\n\s*\n/g, "\n \n");
  return formatted.trim();
}

function splitTextIntoChunks(text: string, maxLen = 1900): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let cutIndex = remaining.lastIndexOf("\n", maxLen);
    if (cutIndex <= 0) cutIndex = remaining.lastIndexOf(" ", maxLen);
    if (cutIndex <= 0) cutIndex = maxLen;
    chunks.push(remaining.substring(0, cutIndex).trim());
    remaining = remaining.substring(cutIndex).trim();
  }
  return chunks;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendTextMessage(psid: string, rawText: string) {
  const token = PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return;

  const text = formatForMessenger(rawText);

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[Send Text Error]: HTTP", res.status, err);
    }
  } catch (err) {
    console.error("[Send Text Error]:", err);
  }
}

async function sendImageMessage(psid: string, imageUrl: string): Promise<boolean> {
  const token = PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token || !imageUrl) return false;

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        message: {
          attachment: {
            type: "image",
            payload: {
              url: imageUrl,
              is_reusable: true,
            },
          },
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[Send Image Error]: HTTP", res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Send Image Error]:", err);
    return false;
  }
}

async function sendMessageParts(
  psid: string,
  parts: string[],
  allowDiscountWords: boolean = false,
): Promise<string[]> {
  const sentParts: string[] = [];

  for (const part of parts) {
    if (!part || !part.trim()) continue;
    const subParts = part.split(/\[SPLIT\]/i);

    for (const sub of subParts) {
      if (!sub || !sub.trim()) continue;
      const sanitized = sanitizePriceWording(sub.trim(), allowDiscountWords);
      const formatted = formatForMessenger(sanitized);

      if (formatted.length > 1950) {
        const chunks = splitTextIntoChunks(formatted, 1900);
        for (const chunk of chunks) {
          await sendTextMessage(psid, chunk);
          sentParts.push(chunk);
          await sleep(400);
        }
      } else {
        await sendTextMessage(psid, formatted);
        sentParts.push(formatted);
        await sleep(400);
      }
    }
  }

  return sentParts;
}

export function formatAddressing(name?: string | null): string {
  if (!name || !name.trim()) return "Ma'am/Sir";
  const clean = name.trim().replace(/^messenger\s+customer$/i, "");
  if (!clean) return "Ma'am/Sir";
  const firstName = clean.split(/\s+/)[0];
  return `Sir/Ma'am ${firstName}`;
}

// ---------------------------------------------------------------------------
// 1. Meta Webhook Verification Handshake (GET)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return new Response("Forbidden: Invalid verify token", { status: 403 });
}

// ---------------------------------------------------------------------------
// 2. Incoming Messenger Messages & Attachments (POST)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Direct testing payload support (e.g. { text: "...", senderPsid: "..." })
    if (body.text && (body.senderPsid || body.sender_id)) {
      const psid = String(body.senderPsid || body.sender_id);
      const text = String(body.text).trim();
      const result = await handleIncomingMessengerFlow(psid, text, []);
      return NextResponse.json({ status: "SUCCESS", result }, { status: 200 });
    }

    // Standard Meta Webhook payload (Page messaging and standby channels)
    if (body.object === "page") {
      for (const entry of body.entry ?? []) {
        const events = [...(entry.messaging || []), ...(entry.standby || [])];

        for (const event of events) {
          const senderPsid = event.sender?.id;
          if (!senderPsid) continue;

          const messageText = (event.message?.text || "").trim();
          const attachments = event.message?.attachments || [];

          await handleIncomingMessengerFlow(senderPsid, messageText, attachments);
        }
      }

      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  } catch (err: any) {
    console.error("[Meta Webhook Error]:", err);
    return NextResponse.json({ status: "ERROR", error: err.message }, { status: 200 });
  }
}

// ---------------------------------------------------------------------------
// 3. Conversational Booking Engine
// ---------------------------------------------------------------------------
async function handleIncomingMessengerFlow(
  psid: string,
  userText: string,
  attachments: Array<{ type: string; payload?: { url?: string } }>,
) {
  const lowerText = userText.toLowerCase().trim();

  // Reset or cancel command
  if (lowerText === "cancel" || lowerText === "restart" || lowerText === "reset") {
    const existing = await getSession(psid);
    if (existing?.step === "BOOKED") {
      const cancelParts = [
        `We understand your request.`,
        `CANCELLATION POLICY:\n \nPer our policy, all down payments are strictly non-refundable. Canceling this reservation forfeits the ₱500 deposit.`,
        `If you still wish to proceed with cancellation, our dispatch team can assist you directly at ${DISPATCH_PHONE}.`,
      ];
      await sendMessageParts(psid, cancelParts);
      return { action: "CANCEL_BOOKED_POLICY_STATED" };
    }

    await saveSession(psid, null);
    await sendMessageParts(psid, [
      `Booking session reset. 🚗\n \nYou can inspect our live availability calendar anytime here:\n👉 ${PUBLIC_AVAILABILITY_URL}\n \nOr tell us your rental dates and preferred car anytime!`,
    ]);
    return { action: "RESET" };
  }

  const session = await getSession(psid);

  // -------------------------------------------------------------------------
  // ATTACHMENT FLOW: Photo of ID, Proof of Billing, or Down Payment Receipt
  // -------------------------------------------------------------------------
  const imageAttachment = attachments.find((att) => att.type === "image" && att.payload?.url);
  if (imageAttachment?.payload?.url) {
    return await processIdPhotoAndAttachToBooking(
      psid,
      session,
      imageAttachment.payload.url,
      userText,
    );
  }

  // Parse booking details early so all handlers have access to parsed fields
  const parsed = parseBookingDetails(userText);

  // -------------------------------------------------------------------------
  // PHOTO REQUEST HANDLER: Triggered BEFORE booking-details parsing
  // -------------------------------------------------------------------------
  const isPhotoRequest =
    /\b(photo|photos|picture|pictures|pic|pics|image|images|larawan|litrato|pakita)\b/i.test(
      lowerText,
    );

  if (isPhotoRequest) {
    const start = session?.startDate || parsed.startDate || manilaToday();
    const end = session?.endDate || parsed.endDate || start;
    const { all, available } = await checkFleetAvailability(start, end);

    // Check if user specifically named a car in the current message
    const carQuery = parsed.vehicleQuery;
    const namedCar = carQuery ? await resolveCarChoice(carQuery, start, end) : null;

    if (namedCar) {
      if (namedCar.isAvailable) {
        if (namedCar.car.image_url) {
          await sendImageMessage(psid, namedCar.car.image_url);
          let caption =
            `${namedCar.car.displayName} (${namedCar.car.type || "Car"}, ${namedCar.car.transmission || "Auto"})\n \n` +
            `Color: ${namedCar.car.color || "Standard"}\n` +
            `Capacity: ${namedCar.car.capacity || 5} seats\n` +
            `Fuel: ${namedCar.car.fuel_type || "Gasoline"}\n` +
            `Rate: ₱${(namedCar.car.price_24_hours || 0).toLocaleString()} per 24 hours`;

          if (session?.step === "AWAITING_CAR" || session?.step === "AWAITING_FORM") {
            caption += `\n \nReply with the car name to reserve it 😊`;
          }

          await sendMessageParts(psid, [caption]);
          return {
            action: "SENT_NAMED_CAR_IMAGE",
            carId: namedCar.car.id,
            imageUrl: namedCar.car.image_url,
          };
        } else {
          // No image URL available on file for this car
          await sendMessageParts(psid, [
            `We don't have a photo on file for the ${namedCar.car.displayName} right now.\n \n` +
              `You can view our live fleet and availability calendar here:\n👉 ${PUBLIC_AVAILABILITY_URL}`,
          ]);
          return { action: "NO_IMAGE_FOR_CAR", carId: namedCar.car.id };
        }
      } else {
        // Car is booked for these dates
        let unavailableMsg =
          `The ${namedCar.car.displayName} is currently booked for your dates (${start} to ${end}). 🚗❌\n \n` +
          `Here are available units ready for your dates:`;

        const availableWithImages = available.filter((item) => item.car.image_url).slice(0, 3);
        await sendMessageParts(psid, [unavailableMsg]);

        for (const item of availableWithImages) {
          if (item.car.image_url) {
            await sendImageMessage(psid, item.car.image_url);
            await sendMessageParts(psid, [
              `${item.car.displayName} — ₱${(item.car.price_24_hours || 0).toLocaleString()} per 24 hours`,
            ]);
            await sleep(400);
          }
        }

        return { action: "CAR_UNAVAILABLE_SENT_ALTERNATIVES" };
      }
    }

    // General photo request: send up to 4 images of available cars
    const availableWithImages = available.filter((item) => item.car.image_url).slice(0, 4);

    if (availableWithImages.length === 0) {
      await sendMessageParts(psid, [
        `You can inspect all our vehicles and real-time open calendar dates here:\n👉 ${PUBLIC_AVAILABILITY_URL}`,
      ]);
      return { action: "NO_IMAGES_AVAILABLE" };
    }

    for (const item of availableWithImages) {
      if (item.car.image_url) {
        await sendImageMessage(psid, item.car.image_url);
        await sendMessageParts(psid, [
          `${item.car.displayName} (${item.car.type || "Car"}, ${item.car.transmission || "Auto"}) — ₱${(item.car.price_24_hours || 0).toLocaleString()} per 24 hours`,
        ]);
        await sleep(400);
      }
    }

    let linkBubble = `You can view our full fleet and live calendar anytime here:\n👉 ${PUBLIC_AVAILABILITY_URL}`;
    if (session?.step === "AWAITING_CAR" || session?.step === "AWAITING_FORM") {
      linkBubble += `\n \nReply with the car name to reserve it 😊`;
    }
    await sendMessageParts(psid, [linkBubble]);

    return { action: "SENT_FLEET_IMAGES", count: availableWithImages.length };
  }

  // -------------------------------------------------------------------------
  // STEP: AWAITING CONFIRMATION ("YES" / "CONFIRM")
  // -------------------------------------------------------------------------
  const isAffirmative =
    /^(yes|oo|opo|confirm|proceed|yes po|tama|ok|sige|agree|book it|go)\b/i.test(lowerText) ||
    lowerText === "yes" ||
    lowerText === "oo";

  if (session && session.step === "AWAITING_CONFIRMATION" && isAffirmative) {
    const supabase = getAdminClient();
    if (!supabase) return { error: "Database unavailable" };

    // Validation: Never insert fake fallback data!
    if (!session.carId || !session.guestName || !session.guestPhone) {
      await sendMessageParts(psid, [
        `Some reservation details are missing. Please provide your Full Name, Mobile Number, and Preferred Car to proceed.`,
      ]);
      return { error: "MISSING_REQUIRED_SESSION_DATA" };
    }

    const startDate = session.startDate || manilaToday();
    const endDate = session.endDate || startDate;
    const pickupTime = session.pickupTime || "08:00:00";
    const returnTime = session.returnTime || "08:00:00";
    const guestName = session.guestName;
    const phone = session.guestPhone;
    const carId = session.carId;
    const carName = session.carName || "Vehicle";
    const dailyPrice = session.carPrice || 1500;
    const days = calculateDays(startDate, endDate);
    const totalPrice = session.totalPrice || dailyPrice * days;
    const fulfillmentType = session.fulfillmentType || "Pickup";
    const rentalType = session.rentalType || "Self-Drive";
    const branchId = session.branchId || 1;

    // Live availability re-check before saving to database
    const { available } = await checkFleetAvailability(startDate, endDate);
    const isStillAvailable = available.some((a) => a.car.id === carId);

    if (!isStillAvailable) {
      const sameType = available.find((a) => a.car.id !== carId);
      let conflictMsg = `Notice: The ${carName} was just reserved for ${startDate} to ${endDate}. 🚗❌\n \n`;
      if (sameType) {
        conflictMsg +=
          `Good news! We have an available unit ready:\n` +
          `👉 ${sameType.car.displayName} — ₱${(sameType.car.price_24_hours || 1500).toLocaleString()} per 24 hours\n \n` +
          `Reply "YES" to reserve the ${sameType.car.displayName} instead!`;

        await saveSession(psid, {
          ...session,
          carId: sameType.car.id,
          carName: sameType.car.displayName,
          carPrice: sameType.car.price_24_hours || 1500,
          totalPrice: (sameType.car.price_24_hours || 1500) * days,
        });
      } else {
        conflictMsg +=
          `Please check open calendar dates here:\n👉 ${PUBLIC_AVAILABILITY_URL}\n \n` +
          `Or contact dispatch at ${DISPATCH_PHONE}.`;
      }
      await sendMessageParts(psid, [conflictMsg]);
      return { action: "CONFLICT_AT_CONFIRMATION" };
    }

    // Check for duplicate pending insertion within the last 5 minutes
    const { data: recentDuplicate } = await supabase
      .from("bookings")
      .select("id")
      .eq("phone_number", phone)
      .eq("start_date", startDate)
      .eq("end_date", endDate)
      .eq("status", "Pending")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    let bookingId: number;

    if (recentDuplicate) {
      bookingId = recentDuplicate.id;
    } else {
      const { data: newBooking, error: bookingErr } = await supabase
        .from("bookings")
        .insert({
          branch_id: branchId,
          guest_name: guestName,
          phone_number: phone,
          gmail: session.guestEmail || null,
          car_id: carId,
          start_date: startDate,
          end_date: endDate,
          pickup_time: pickupTime,
          return_time: returnTime,
          total_price: totalPrice,
          status: "Pending",
          booking_type: "online",
          fulfillment_type: fulfillmentType,
          delivery_address: session.deliveryAddress || null,
          remarks: `Direct booking via Facebook Messenger (PSID: ${psid}) - ${carName} (${rentalType})`,
        })
        .select("id")
        .single();

      if (bookingErr || !newBooking) {
        console.error("[Booking Insert Error]:", bookingErr);
        await sendMessageParts(psid, [
          `Sorry, we encountered a technical issue recording your booking. Please reach our dispatch team directly at ${DISPATCH_PHONE}.`,
        ]);
        return { error: bookingErr };
      }

      bookingId = newBooking.id;

      await supabase.from("booking_payments").insert({
        booking_id: bookingId,
        daily_rent: dailyPrice,
        total_gross: totalPrice,
        total_net: totalPrice,
        operator_share: 0,
      });
    }

    // Advance session to BOOKED
    await saveSession(psid, {
      ...session,
      step: "BOOKED",
      bookingId,
    });

    const parts = [
      `🎉 RESERVATION RECEIVED!\n \nYour booking details are now registered in our system under Reference #BK-${bookingId}.`,
      `To lock in your schedule, please send clear photos of the following in this chat:\n \n` +
        `1. 🪪 Valid government ID or driver's license\n` +
        `2. 📄 Proof of billing (electric, water, or internet bill)\n` +
        `3. 💳 Proof of ₱500 down payment (GCash or bank transfer receipt)`,
      `Our dispatch team will verify your documents against your booking reference to finalize your schedule. 🚗✨`,
    ];

    await sendMessageParts(psid, parts);
    return {
      action: "BOOKING_INSERTED",
      bookingId,
      guestName,
      status: "Pending",
      bookingType: "online",
      totalPrice,
    };
  }

  // -------------------------------------------------------------------------
  // POST-BOOKING CHANGES OR QUESTIONS
  // -------------------------------------------------------------------------
  if (session && session.step === "BOOKED") {
    if (/change|adjust|reschedule|lipat/i.test(lowerText)) {
      await saveSession(psid, { ...session, step: "AWAITING_FORM" });
      await sendMessageParts(psid, [
        `Sure! Please send the updated dates, vehicle, or details you would like to change.`,
      ]);
      return { action: "RETURNED_TO_FORM_FROM_BOOKED" };
    }
  }

  // -------------------------------------------------------------------------
  // PARSE BOOKING DETAILS FROM TEXT
  // -------------------------------------------------------------------------

  // If customer is in AWAITING_FORM or sent any details:
  const startDate = parsed.startDate || session?.startDate || manilaToday();
  const endDate = parsed.endDate || session?.endDate || startDate;
  const pickupTime = parsed.pickupTime || session?.pickupTime || "08:00:00";
  const returnTime = parsed.returnTime || session?.returnTime || "08:00:00";
  const guestName = parsed.name || session?.guestName || null;
  const guestPhone = parsed.phone || session?.guestPhone || null;
  const fulfillmentType = parsed.fulfillmentType || session?.fulfillmentType || null;
  const rentalType = parsed.rentalType || session?.rentalType || null;

  // Resolve vehicle
  const carQuery = parsed.vehicleQuery || userText;
  const resolvedChoice = await resolveCarChoice(carQuery, startDate, endDate);
  const selectedCar = resolvedChoice?.car || null;
  const carId = selectedCar?.id || session?.carId || null;
  const carName = selectedCar?.displayName || session?.carName || null;
  const dailyPrice = selectedCar?.price_24_hours || session?.carPrice || null;
  const branchId = selectedCar?.branch_id || session?.branchId || 1;
  const carType = selectedCar?.type || null;

  // Multi-day duration check
  let days = calculateDays(startDate, endDate);
  if (parsed.requestedDays && parsed.requestedDays > 0) {
    days = parsed.requestedDays;
  }

  // Price Decision Engine evaluation
  let priceDecision: PriceDecision | null = null;
  if (dailyPrice) {
    const isFirstQuote = session?.lastQuotedPricePerDay === undefined;
    priceDecision = decidePriceWording(
      session?.lastQuotedPricePerDay,
      dailyPrice,
      days,
      carType,
      isFirstQuote,
    );
  }

  // -------------------------------------------------------------------------
  // VALIDATION & MISSING FIELDS CHECK
  // -------------------------------------------------------------------------
  const missingFields: string[] = [];
  if (!guestName) missingFields.push("• Full Name:");
  if (!guestPhone) missingFields.push("• Mobile Number:");
  if (!carName) missingFields.push("• Preferred Vehicle:");
  if (!parsed.startDate && !session?.startDate) missingFields.push("• Pick-up Date & Time:");
  if (!parsed.endDate && !session?.endDate) missingFields.push("• Return Date & Time:");
  if (!fulfillmentType)
    missingFields.push("• Pick-up at Office (FREE) or Doorstep Delivery:");
  if (!rentalType) missingFields.push("• Self-Drive or With Driver:");

  // Check if this was a standalone price inquiry or general question
  const isPriceInquiry =
    /how much|rate|magkano|presyo|price|how about/i.test(lowerText) && !parsed.phone;

  if (isPriceInquiry && dailyPrice && carName) {
    await saveSession(psid, {
      ...session,
      step: session?.step || "AWAITING_CAR",
      carId: carId || undefined,
      carName,
      carPrice: dailyPrice,
      startDate,
      endDate,
      pickupTime,
      returnTime,
      lastQuotedPricePerDay: dailyPrice,
      lastQuotedCarId: carId || undefined,
    });

    const quoteParts = [
      priceDecision?.priceText ||
        `Rate: ₱${dailyPrice.toLocaleString()} per 24 hours (self-drive).`,
      `You can view our live fleet and availability calendar here:\n👉 ${PUBLIC_AVAILABILITY_URL}`,
      `To reserve the ${carName}, please send your:\n${missingFields.join("\n")}`,
    ];

    await sendMessageParts(psid, quoteParts, priceDecision?.allowDiscountWords);
    return {
      action: "QUOTED_PRICE",
      carName,
      priceDecision,
    };
  }

  // If vehicle is booked for these dates:
  if (resolvedChoice && !resolvedChoice.isAvailable && selectedCar) {
    const { available } = await checkFleetAvailability(startDate, endDate);
    const sameTypeAlt = available.find(
      (a) => a.car.type?.toLowerCase() === selectedCar.type?.toLowerCase(),
    );

    let conflictReply = `Notice: The ${selectedCar.displayName} is already reserved for ${startDate} to ${endDate}. 🚗❌\n \n`;

    if (sameTypeAlt) {
      conflictReply +=
        `Good news! We have an available ${selectedCar.type || "unit"} ready for you:\n` +
        `👉 ${sameTypeAlt.car.displayName} — ₱${(sameTypeAlt.car.price_24_hours || 1500).toLocaleString()} per 24 hours\n \n` +
        `Would you like to reserve the ${sameTypeAlt.car.displayName} instead?`;
    } else {
      conflictReply += `Here are open vehicles ready for ${startDate} to ${endDate}:\n \n`;
      available.slice(0, 4).forEach((item, idx) => {
        conflictReply += `${idx + 1}. ${item.car.displayName} — ₱${(item.car.price_24_hours || 0).toLocaleString()} per 24 hours\n`;
      });
      conflictReply += `\n \nView real-time calendar:\n👉 ${PUBLIC_AVAILABILITY_URL}`;
    }

    await sendMessageParts(psid, [conflictReply]);
    return { action: "CAR_CONFLICT_ALTERNATIVES_OFFERED" };
  }

  // If customer provided some details but some are missing:
  if (missingFields.length > 0 && (parsed.phone || parsed.vehicleQuery || parsed.name || session)) {
    await saveSession(psid, {
      step: "AWAITING_FORM",
      guestName: guestName || undefined,
      guestPhone: guestPhone || undefined,
      carId: carId || undefined,
      carName: carName || undefined,
      carPrice: dailyPrice || undefined,
      branchId,
      startDate,
      endDate,
      pickupTime,
      returnTime,
      fulfillmentType: fulfillmentType || undefined,
      rentalType: rentalType || undefined,
      lastQuotedPricePerDay: dailyPrice || session?.lastQuotedPricePerDay,
      lastQuotedCarId: carId || session?.lastQuotedCarId,
    });

    const parts: string[] = [];

    // If customer already named a car and dates, skip general greeting and confirm rate + math
    if (carName && dailyPrice && (parsed.startDate || session?.startDate)) {
      parts.push(
        `Hi ${formatAddressing(guestName)}! 🚗\n \n` +
          `Since the ${carName} is open on our calendar, here is your rate:\n \n` +
          (priceDecision?.priceText ||
            `Rate: ₱${dailyPrice.toLocaleString()} per 24 hours (self-drive).`),
      );
      parts.push(`To complete your reservation for the ${carName}, please send your:\n${missingFields.join("\n")}`);
    } else {
      parts.push(
        `Hello ${formatAddressing(guestName)}! Welcome to InstaCar Rental Services 🚗✨\n \n` +
          `You can view our live fleet and open calendar dates here:\n👉 ${PUBLIC_AVAILABILITY_URL}`,
      );
      parts.push(`To reserve your vehicle, please send:\n${missingFields.join("\n")}`);
    }

    await sendMessageParts(psid, parts, priceDecision?.allowDiscountWords);
    return { action: "REQUESTED_MISSING_FIELDS", missingFields };
  }

  // -------------------------------------------------------------------------
  // ALL 7 FIELDS ARE PRESENT -> PRESENT STEP 2 SUMMARY
  // -------------------------------------------------------------------------
  if (
    guestName &&
    guestPhone &&
    carName &&
    carId &&
    dailyPrice &&
    startDate &&
    endDate &&
    fulfillmentType &&
    rentalType
  ) {
    // Validate dates
    if (startDate < manilaToday()) {
      await sendMessageParts(psid, [
        `Notice: Pick-up date cannot be in the past. Today in Manila is ${manilaToday()}. Please provide valid dates.`,
      ]);
      return { action: "PAST_DATE_ERROR" };
    }

    const startDateTime = new Date(`${startDate}T${pickupTime}`);
    const endDateTime = new Date(`${endDate}T${returnTime}`);
    if (endDateTime < startDateTime) {
      await sendMessageParts(psid, [
        `Notice: Return schedule must be after pick-up schedule. Please adjust your dates or times.`,
      ]);
      return { action: "INVALID_SCHEDULE_ORDER" };
    }

    const calculatedTotal = dailyPrice * days;

    await saveSession(psid, {
      step: "AWAITING_CONFIRMATION",
      guestName,
      guestPhone,
      carId,
      carName,
      carPrice: dailyPrice,
      branchId,
      startDate,
      endDate,
      pickupTime,
      returnTime,
      fulfillmentType,
      rentalType,
      totalPrice: calculatedTotal,
      lastQuotedPricePerDay: dailyPrice,
      lastQuotedCarId: carId,
    });

    const summaryParts = [
      `Thank you, ${formatAddressing(guestName)}! Please review your reservation summary:`,
      `📋 RESERVATION SUMMARY:\n` +
        `• Customer Name: ${guestName}\n` +
        `• Contact Number: ${guestPhone}\n` +
        `• Vehicle: ${carName}\n` +
        `• Pick-up Schedule: ${startDate} (${formatClock(pickupTime)})\n` +
        `• Return Schedule: ${endDate} (${formatClock(returnTime)})\n` +
        `• Fulfillment: ${fulfillmentType === "Pickup" ? "Pick-up at Office (FREE)" : "Doorstep Delivery"}\n` +
        `• Rental Type: ${rentalType}\n` +
        `• Estimated Total: ₱${calculatedTotal.toLocaleString()} (${days} day${days > 1 ? "s" : ""} x ₱${dailyPrice.toLocaleString()})`,
      `⚠️ CANCELLATION POLICY: Down payments are non-refundable. Canceling this reservation forfeits the ₱500 deposit.`,
      `Are all the details correct?\n \nReply 'YES' to confirm and submit your booking, or tell us what to adjust! 🚗`,
    ];

    await sendMessageParts(psid, summaryParts, priceDecision?.allowDiscountWords);
    return {
      action: "AWAITING_CONFIRMATION",
      guestName,
      carName,
      totalPrice: calculatedTotal,
    };
  }

  // -------------------------------------------------------------------------
  // INITIAL INQUIRY: Live Fleet Availability
  // -------------------------------------------------------------------------
  const start = parsed.startDate || manilaToday();
  const end = parsed.endDate || start;
  const { available } = await checkFleetAvailability(start, end);

  if (available.length === 0) {
    const noCarsParts = [
      `All vehicles are currently reserved for ${start} to ${end}. 😊`,
      `You can check nearby open calendar dates anytime here:\n👉 ${PUBLIC_AVAILABILITY_URL}`,
      `Or contact our dispatch team directly at ${DISPATCH_PHONE} for schedule updates!`,
    ];
    await sendMessageParts(psid, noCarsParts);
    return { action: "NO_CARS_AVAILABLE" };
  }

  await saveSession(psid, {
    step: "AWAITING_CAR",
    startDate: start,
    endDate: end,
  });

  let carListText = `Hello! Welcome to InstaCar Rental Services 🚗✨\n \n`;
  carListText += `Here is our real-time fleet availability for ${start} to ${end}:\n \n`;

  available.slice(0, 6).forEach((item, idx) => {
    carListText += `${idx + 1}. ${item.car.displayName} (${item.car.type || "Car"}, ${item.car.transmission || "Auto"}) — ₱${(item.car.price_24_hours || 0).toLocaleString()} per 24 hours\n`;
  });

  const fleetParts = [
    carListText,
    `You can inspect our live fleet and real-time calendar anytime here:\n👉 ${PUBLIC_AVAILABILITY_URL}`,
    `To reserve, please send:\n` +
      `• Full Name:\n` +
      `• Mobile Number:\n` +
      `• Preferred Vehicle:\n` +
      `• Pick-up Date & Time:\n` +
      `• Return Date & Time:\n` +
      `• Pick-up at Office (FREE) or Doorstep Delivery:\n` +
      `• Self-Drive or With Driver:`,
  ];

  await sendMessageParts(psid, fleetParts);
  return { action: "LISTED_FLEET", count: available.length };
}

// ---------------------------------------------------------------------------
// 4. Download ID / Photo from Meta CDN and Attach to Booking
// ---------------------------------------------------------------------------
async function processIdPhotoAndAttachToBooking(
  psid: string,
  session: BookingSession | null,
  fbImageUrl: string,
  userText: string = "",
) {
  const supabase = getAdminClient();
  if (!supabase) return { error: "Database connection failed" };

  try {
    const token = PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
    const imgRes = await fetch(fbImageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!imgRes.ok) {
      console.error("[Attachment Download Error]: HTTP", imgRes.status);
      await sendMessageParts(psid, [
        `Sorry, we could not download your photo attachment. Please re-send or upload the image again!`,
      ]);
      return { error: "CDN_DOWNLOAD_FAILED" };
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage in booking-uploads bucket
    const fileName = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
    const folder = `messenger_${psid}`;
    const storagePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKETS.bookingUploads)
      .upload(storagePath, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Supabase Storage Upload Error]:", uploadError);
    }

    // Find booking to attach to
    let targetBookingId = session?.bookingId;

    if (!targetBookingId) {
      const { data: recent } = await supabase
        .from("bookings")
        .select("id, primary_id_path, secondary_id_path, proof_billing_path, proof_payment_path")
        .or(`remarks.ilike.%${psid}%,phone_number.eq.${session?.guestPhone || "09"}`)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recent) targetBookingId = recent.id;
    }

    if (targetBookingId) {
      const { data: currentBooking } = await supabase
        .from("bookings")
        .select("primary_id_path, secondary_id_path, proof_billing_path, proof_payment_path")
        .eq("id", targetBookingId)
        .maybeSingle();

      const updateData: Record<string, string | number> = {};
      const isExplicitSecondary = /secondary|second id|back of id/i.test(userText);

      let slotUploaded = "ID";

      // Sequential document order: ID -> Proof of Billing -> ₱500 Payment
      if (!currentBooking?.primary_id_path) {
        updateData.primary_id_path = storagePath;
        slotUploaded = "Primary Valid ID / Driver's License";
      } else if (isExplicitSecondary && !currentBooking?.secondary_id_path) {
        updateData.secondary_id_path = storagePath;
        slotUploaded = "Secondary ID";
      } else if (!currentBooking?.proof_billing_path) {
        updateData.proof_billing_path = storagePath;
        slotUploaded = "Proof of Billing";
      } else {
        updateData.proof_payment_path = storagePath;
        updateData.down_payment = 500;
        slotUploaded = "Proof of Down Payment (₱500)";
      }

      await supabase.from("bookings").update(updateData).eq("id", targetBookingId);

      // Fetch refreshed status of all documents
      const { data: updatedBooking } = await supabase
        .from("bookings")
        .select("primary_id_path, proof_billing_path, proof_payment_path")
        .eq("id", targetBookingId)
        .single();

      const idStatus = updatedBooking?.primary_id_path ? "Received ✅" : "Outstanding ⏳";
      const billingStatus = updatedBooking?.proof_billing_path ? "Received ✅" : "Outstanding ⏳";
      const paymentStatus = updatedBooking?.proof_payment_path ? "Received ✅" : "Outstanding ⏳";

      let nextInstruction = "";
      if (!updatedBooking?.proof_billing_path) {
        nextInstruction = "Please send a photo of your Proof of Billing (electric, water, or internet bill).";
      } else if (!updatedBooking?.proof_payment_path) {
        nextInstruction =
          "Please send a photo of your ₱500 Down Payment receipt (GCash or bank transfer) to lock in your car schedule!";
      } else {
        nextInstruction =
          "All 3 documents received! Our dispatch team is verifying your files and will contact you shortly to confirm release. 🚗✨";
      }

      const statusParts = [
        `📸 Document received! (${slotUploaded})`,
        `DOCUMENT STATUS FOR #BK-${targetBookingId}:\n` +
          `• Valid ID: ${idStatus}\n` +
          `• Proof of Billing: ${billingStatus}\n` +
          `• ₱500 Down Payment Receipt: ${paymentStatus}`,
        nextInstruction,
      ];

      await sendMessageParts(psid, statusParts);
      return {
        action: "DOC_ATTACHED",
        bookingId: targetBookingId,
        slotUploaded,
        outstanding: { idStatus, billingStatus, paymentStatus },
      };
    }

    // If no prior booking exists, save file and prompt user for booking details
    await saveSession(psid, {
      step: "AWAITING_FORM",
      primaryIdPath: storagePath,
    });

    await sendMessageParts(psid, [
      `📸 Document photo saved!\n \nPlease send your booking details (Full Name, Contact Number, Preferred Vehicle, and Dates) so we can register your reservation!`,
    ]);

    return { action: "DOC_SAVED_AWAITING_FORM" };
  } catch (err: any) {
    console.error("[Attachment Process Error]:", err);
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 5. Unified Fleet Availability Checker (Direct from Supabase)
// ---------------------------------------------------------------------------
async function checkFleetAvailability(startDate: string, endDate: string): Promise<{
  all: CarAvailabilityInfo[];
  available: CarAvailabilityInfo[];
  busy: CarAvailabilityInfo[];
}> {
  const supabase = getAdminClient();
  if (!supabase) return { all: [], available: [], busy: [] };

  // 1. Fetch active rentable fleet with full details
  const { data: cars } = await supabase
    .from("cars")
    .select(
      "id, brand, model, type, transmission, color, capacity, fuel_type, image_path, price_24_hours, branch_id, status",
    )
    .in("status", ACTIVE_CAR_STATUSES)
    .order("price_24_hours", { ascending: true });

  if (!cars || cars.length === 0) return { all: [], available: [], busy: [] };

  const carIds = cars.map((c) => c.id);

  // 2. Query overlapping bookings (Pending, Confirmed, Released)
  const { data: overlappingBookings } = await supabase
    .from("bookings")
    .select("car_id, start_date, end_date, status")
    .in("car_id", carIds)
    .in("status", OPEN_BOOKING_STATUSES)
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  // 3. Query overlapping maintenance schedules
  const { data: overlappingSchedules } = await supabase
    .from("car_schedules")
    .select("car_id, start_date, end_date, reason")
    .in("car_id", carIds)
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  const busyMap = new Map<number, { reason: string; start: string; end: string }>();

  for (const b of overlappingBookings || []) {
    if (b.car_id && b.start_date && b.end_date) {
      busyMap.set(b.car_id, {
        reason: "Booked",
        start: b.start_date,
        end: b.end_date,
      });
    }
  }

  for (const s of overlappingSchedules || []) {
    if (s.car_id && s.start_date && s.end_date && !busyMap.has(s.car_id)) {
      busyMap.set(s.car_id, {
        reason: s.reason || "Maintenance",
        start: s.start_date,
        end: s.end_date,
      });
    }
  }

  const all: CarAvailabilityInfo[] = cars.map((car) => {
    const conflict = busyMap.get(car.id);
    const primaryPhoto = car.image_path ? car.image_path.split(",")[0].trim() : null;
    const imageUrl =
      primaryPhoto && primaryPhoto !== "default.png" ? carImageUrl(primaryPhoto) : null;
    const displayName = `${car.brand || ""} ${car.model || ""}`.trim() || "Vehicle";

    return {
      car: {
        id: car.id,
        brand: car.brand,
        model: car.model,
        displayName,
        type: car.type,
        transmission: car.transmission,
        color: car.color,
        capacity: car.capacity,
        fuel_type: car.fuel_type,
        image_path: car.image_path,
        image_url: imageUrl,
        price_24_hours: car.price_24_hours,
        branch_id: car.branch_id,
        status: car.status,
      },
      isAvailable: !conflict,
      conflictReason: conflict?.reason,
      conflictRange: conflict ? { start: conflict.start, end: conflict.end } : undefined,
    };
  });

  return {
    all,
    available: all.filter((c) => c.isAvailable),
    busy: all.filter((c) => !c.isAvailable),
  };
}

async function resolveCarChoice(text: string, startDate?: string, endDate?: string) {
  const start = startDate || manilaToday();
  const end = endDate || start;

  const { all, available } = await checkFleetAvailability(start, end);
  if (all.length === 0) return null;

  const num = parseInt(text.trim(), 10);
  if (!isNaN(num) && num >= 1 && num <= available.length) {
    return available[num - 1];
  }

  const query = text.toLowerCase().trim();

  // 1. Check if available cars match query or query contains model/brand
  const availableMatch = available.find((item) => {
    const model = (item.car.model || "").toLowerCase();
    const brand = (item.car.brand || "").toLowerCase();
    const dName = item.car.displayName.toLowerCase();
    const type = (item.car.type || "").toLowerCase();

    return (
      dName.includes(query) ||
      model.includes(query) ||
      brand.includes(query) ||
      type === query ||
      query.includes(model) ||
      (model.length > 3 && query.includes(model.split(" ")[0])) ||
      query.includes(dName)
    );
  });

  if (availableMatch) return availableMatch;

  // 2. Fallback to any car in fleet to detect conflicts
  const busyMatch = all.find((item) => {
    const model = (item.car.model || "").toLowerCase();
    const brand = (item.car.brand || "").toLowerCase();
    const dName = item.car.displayName.toLowerCase();
    const type = (item.car.type || "").toLowerCase();

    return (
      dName.includes(query) ||
      model.includes(query) ||
      brand.includes(query) ||
      type === query ||
      query.includes(model) ||
      (model.length > 3 && query.includes(model.split(" ")[0])) ||
      query.includes(dName)
    );
  });

  return busyMatch || null;
}

// ---------------------------------------------------------------------------
// 6. Natural Language Booking Parsing
// ---------------------------------------------------------------------------
function parseBookingDetails(text: string) {
  const segments = text.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);

  // 1. Phone number (PH format: 09XXXXXXXXX, +639XXXXXXXXX, 10-11 digits)
  const phoneMatch = text.match(/(?:(?:\+?63|0)9\d{8,9}|\b09\d{9}\b|\b\d{10,11}\b)/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, "") : null;

  // 2. Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : null;

  // 3. Fulfillment type
  let fulfillmentType: "Pickup" | "Delivery" | null = null;
  if (/deliver|delivery|doorstep|ihatod/i.test(text)) {
    fulfillmentType = "Delivery";
  } else if (/pickup|pick-up|office|pandac|pavia/i.test(text)) {
    fulfillmentType = "Pickup";
  }

  // 4. Rental type (Self-Drive vs With Driver)
  let rentalType: "Self-Drive" | "With Driver" | null = null;
  if (/with driver|with-driver|may driver|chauffeur|driven/i.test(text)) {
    rentalType = "With Driver";
  } else if (/self drive|self-drive|selfdrive|no driver|walang driver/i.test(text)) {
    rentalType = "Self-Drive";
  }

  // 5. Requested duration (e.g., "for 2 days", "3 days")
  const daysMatch = text.match(/(\d+)\s*(?:day|days|araw)/i);
  const requestedDays = daysMatch ? parseInt(daysMatch[1], 10) : null;

  // 6. Vehicle / Category Matching
  let vehicleQuery: string | null = null;
  const types = ["hatchback", "sedan", "suv", "mpv", "van", "pickup truck"];
  const models = [
    "honda city",
    "city",
    "wigo",
    "vios",
    "mirage g4",
    "mirage",
    "xpander",
    "fortuner",
    "urvan",
    "navara",
    "rush",
    "raize",
    "almera",
    "toyota",
    "mitsubishi",
    "honda",
    "nissan",
  ];

  for (const m of models) {
    if (new RegExp("\\b" + m + "\\b", "i").test(text)) {
      vehicleQuery = m;
      break;
    }
  }
  if (!vehicleQuery) {
    for (const t of types) {
      if (new RegExp("\\b" + t + "\\b", "i").test(text)) {
        vehicleQuery = t;
        break;
      }
    }
  }

  // 7. Dates & Times Parsing
  const monthMap: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  const dateRegex =
    /(?:(\d{4})-(\d{1,2})-(\d{1,2})|(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?|(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?)(?:\s*(?:at\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2}))?/gi;

  const foundDates: Array<{ date: string; time: string }> = [];
  let match;
  const currentYear = new Date().getFullYear();

  while ((match = dateRegex.exec(text)) !== null) {
    let year = currentYear;
    let month = 1;
    let day = 1;
    const timeStr = match[10] || "";

    if (match[1]) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else if (match[4]) {
      const mName = match[4].toLowerCase();
      month = monthMap[mName] || 1;
      day = parseInt(match[5], 10);
      if (match[6]) year = parseInt(match[6], 10);
    } else if (match[7]) {
      month = parseInt(match[7], 10);
      day = parseInt(match[8], 10);
      if (match[9]) {
        year = parseInt(match[9].length === 2 ? "20" + match[9] : match[9], 10);
      }
    }

    let formattedTime = "08:00:00";
    if (timeStr) {
      const cleanTime = timeStr.trim().toLowerCase();
      const timeMatch = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
        formattedTime = `${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
      }
    }

    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    foundDates.push({ date: isoDate, time: formattedTime });
  }

  const startDate = foundDates[0]?.date || null;
  const pickupTime = foundDates[0]?.time || "08:00:00";
  let endDate = foundDates[1]?.date || null;
  const returnTime = foundDates[1]?.time || "08:00:00";

  if (startDate && !endDate && requestedDays && requestedDays > 1) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (requestedDays - 1));
    endDate = d.toISOString().split("T")[0];
  }

  // 8. Name extraction
  let rawName: string | null = null;
  for (const seg of segments) {
    if (phone && seg.includes(phone)) continue;
    if (email && seg.includes(email)) continue;
    if (
      /pickup|delivery|self drive|with driver|office|pandac|sa office|book|rent|hatchback|sedan|suv|mpv|van|toyota|wigo|mirage|vios|city|honda|nissan|how much|rate|days|yes|confirm/i.test(
        seg,
      )
    )
      continue;
    if (seg.match(dateRegex)) continue;
    if (/^[A-Za-z\s.'-]+$/.test(seg) && seg.length >= 3 && seg.length <= 40) {
      rawName = seg.trim();
      break;
    }
  }

  const name = rawName
    ? rawName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : null;

  return {
    phone,
    email,
    vehicleQuery,
    fulfillmentType,
    rentalType,
    requestedDays,
    startDate,
    pickupTime,
    endDate,
    returnTime,
    name,
  };
}

function calculateDays(start?: string, end?: string): number {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff || 1);
}

function formatClock(value: string | null | undefined): string {
  if (!value) return "8:00 AM";
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
