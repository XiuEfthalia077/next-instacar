import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { manilaToday } from "@/lib/datetime";
import { ACTIVE_CAR_STATUSES, OPEN_BOOKING_STATUSES } from "@/lib/data/legacy-status";
import { BUCKETS } from "@/lib/storage";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "instacar_messenger_verify_token_2026";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";
const OFFICE_MAP_URL =
  "https://www.google.com/maps/place/Instacar+Car+Rental+Services/@10.7495679,122.5172827,17z/data=!3m1!4b1!4m6!3m5!1s0x33aefb4f8be44f49:0x930b22a3c6978b93!8m2!3d10.7495626!4d122.5198576!16s%2Fg%2F11vq394xy6";
const PUBLIC_AVAILABILITY_URL = "https://instacar.vercel.app/availability";

interface BookingSession {
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
  returnDeliveryAddress?: string;
  totalPrice?: number;
  primaryIdPath?: string;
  proofBillingPath?: string;
  proofPaymentPath?: string;
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
    await saveSession(psid, null);
    await sendTextMessage(
      psid,
      `Booking session reset. 🚗\n\nYou can inspect our live availability calendar anytime here:\n👉 ${PUBLIC_AVAILABILITY_URL}\n\nOr tell us your rental dates and preferred car anytime!`,
    );
    return { action: "RESET" };
  }

  const session = await getSession(psid);

  // -------------------------------------------------------------------------
  // ATTACHMENT FLOW: Photo of ID, Proof of Billing, or Down Payment Receipt
  // -------------------------------------------------------------------------
  const imageAttachment = attachments.find((att) => att.type === "image" && att.payload?.url);
  if (imageAttachment?.payload?.url) {
    return await processIdPhotoAndAttachToBooking(psid, session, imageAttachment.payload.url);
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

    const startDate = session.startDate || manilaToday();
    const endDate = session.endDate || startDate;
    const pickupTime = session.pickupTime || "08:00:00";
    const returnTime = session.returnTime || "08:00:00";
    const guestName = session.guestName || "Messenger Customer";
    const phone = session.guestPhone || "09170000000";
    const carId = session.carId || 14;
    const carName = session.carName || "Toyota Wigo 2025 (Hatchback)";
    const dailyPrice = session.carPrice || 1500;
    const days = calculateDays(startDate, endDate);
    const totalPrice = session.totalPrice || dailyPrice * days;
    const fulfillmentType = session.fulfillmentType || "Pickup";
    const branchId = session.branchId || 1;

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
      // INSERT DIRECTLY INTO public.bookings
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
          status: "Pending", // Online booking stays Pending for admin confirmation!
          booking_type: "online", // Appears in /admin/bookings_online!
          fulfillment_type: fulfillmentType,
          delivery_address: session.deliveryAddress || null,
          remarks: `Direct booking via Facebook Messenger (PSID: ${psid}) - ${carName}`,
        })
        .select("id")
        .single();

      if (bookingErr || !newBooking) {
        console.error("[Booking Insert Error]:", bookingErr);
        await sendTextMessage(
          psid,
          "Sorry, we encountered a technical issue recording your booking. Please call dispatch directly at 0917 554 0394.",
        );
        return { error: bookingErr };
      }

      bookingId = newBooking.id;

      // INSERT INTO public.booking_payments
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

    const fulfillmentDetails =
      fulfillmentType === "Pickup"
        ? `• Pick-up Location: InstaCar Main Office (Pandac, Pavia, Iloilo) 📍\n  Google Maps: ${OFFICE_MAP_URL}`
        : `• Fulfillment: Doorstep Delivery (Delivery fee applies based on distance)`;

    await sendTextMessage(
      psid,
      `🎉 BOOKING CONFIRMED & SUBMITTED TO SYSTEM!\n\n` +
        `📋 BOOKING REFERENCE: #BK-${bookingId}\n` +
        `• Status: 🟡 PENDING ADMIN APPROVAL\n` +
        `• Customer Name: ${guestName}\n` +
        `• Contact Number: ${phone}\n` +
        `• Vehicle: ${carName}\n` +
        `• Schedule: ${startDate} (${formatClock(pickupTime)}) to ${endDate} (${formatClock(returnTime)})\n` +
        `• Rental Duration: ${days} day(s)\n` +
        `• Total Amount: ₱${totalPrice.toLocaleString()}\n` +
        `${fulfillmentDetails}\n\n` +
        `📸 NEXT STEP - LOCK IN YOUR RESERVATION:\n` +
        `Please send photos of the following right here in this chat:\n` +
        `1. 🪪 Valid Government ID or Driver's License\n` +
        `2. 📄 Proof of Billing (electric, water, or credit card bill)\n` +
        `3. 💳 Proof of Down Payment (GCash or Bank transfer receipt — ₱500)\n\n` +
        `Our dispatch team is reviewing your booking now and will verify your documents to confirm! 🚗✨`,
    );

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
  // PARSE BOOKING DETAILS FROM TEXT
  // -------------------------------------------------------------------------
  const parsed = parseBookingDetails(userText);

  // If customer provided booking details (phone, dates, or car):
  const hasBookingDetails =
    Boolean(parsed.phone && (parsed.startDate || parsed.vehicleQuery)) ||
    Boolean(session && session.step === "AWAITING_FORM" && (parsed.phone || userText.length > 5));

  if (hasBookingDetails) {
    const supabase = getAdminClient();
    if (!supabase) return { error: "Database unavailable" };

    const startDate = parsed.startDate || session?.startDate || manilaToday();
    const endDate = parsed.endDate || session?.endDate || startDate;
    const pickupTime = parsed.pickupTime || session?.pickupTime || "08:00:00";
    const returnTime = parsed.returnTime || session?.returnTime || "08:00:00";
    const phone = parsed.phone || session?.guestPhone || "09170000000";
    const email = parsed.email || session?.guestEmail || null;
    const fulfillmentType = parsed.fulfillmentType || session?.fulfillmentType || "Pickup";
    const guestName = parsed.name || session?.guestName || "Messenger Customer";

    // Check complete fleet availability for these exact dates (bookings + schedules)
    const { available, busy } = await checkFleetAvailability(startDate, endDate);

    // Resolve vehicle choice against the requested text or session
    const carChoice = await resolveCarChoice(parsed.vehicleQuery || userText, startDate, endDate);

    let selectedCar = carChoice?.car || null;
    const isSelectedCarBusy = Boolean(carChoice && !carChoice.isAvailable);

    // If requested vehicle is BOOKED or IN MAINTENANCE for these dates:
    if (selectedCar && isSelectedCarBusy) {
      const busyCarName = `${selectedCar.brand} ${selectedCar.model} (${selectedCar.type || "Vehicle"})`;
      const conflictRange = carChoice?.conflictRange
        ? `${carChoice.conflictRange.start} to ${carChoice.conflictRange.end}`
        : `${startDate} to ${endDate}`;

      // Check if we have an available alternative of the same body type
      const sameTypeAlternative = available.find(
        (item) => item.car.type?.toLowerCase() === selectedCar?.type?.toLowerCase(),
      );

      let conflictReply = `⚠️ NOTICE: The ${busyCarName} is already RESERVED/BOOKED for ${conflictRange}! 🚗❌\n\n`;

      if (sameTypeAlternative) {
        const altName = `${sameTypeAlternative.car.brand} ${sameTypeAlternative.car.model} (${sameTypeAlternative.car.type}, ${sameTypeAlternative.car.transmission || "Auto"})`;
        conflictReply +=
          `🟢 Good news! We have an identical available ${selectedCar.type || "vehicle"} ready for you:\n` +
          `👉 ${altName} — ₱${(sameTypeAlternative.car.price_24_hours || 1500).toLocaleString()}/day\n\n` +
          `Would you like to reserve the ${altName} instead?\n` +
          `Reply "YES" to proceed with this car, or choose from our open units:\n\n`;
      } else {
        conflictReply += `Here are our available vehicles for ${startDate} to ${endDate}:\n\n`;
      }

      available.slice(0, 4).forEach((item, idx) => {
        conflictReply += `${idx + 1}. ${item.car.brand} ${item.car.model} (${item.car.type || "Car"}, ${item.car.transmission || "Auto"}) — ₱${(item.car.price_24_hours || 0).toLocaleString()}/day\n`;
      });

      conflictReply += `\n🌐 View our real-time interactive availability calendar:\n👉 ${PUBLIC_AVAILABILITY_URL}\n\n`;
      conflictReply += `Reply with your preferred available car to proceed!`;

      // Save session with alternative car if available so customer can reply "YES"
      if (sameTypeAlternative) {
        const altDailyPrice = sameTypeAlternative.car.price_24_hours || 1500;
        const altDays = calculateDays(startDate, endDate);
        await saveSession(psid, {
          step: "AWAITING_CONFIRMATION",
          guestName,
          guestPhone: phone,
          guestEmail: email || undefined,
          carId: sameTypeAlternative.car.id,
          carName: `${sameTypeAlternative.car.brand} ${sameTypeAlternative.car.model} (${sameTypeAlternative.car.type || "Car"})`,
          carPrice: altDailyPrice,
          branchId: sameTypeAlternative.car.branch_id || 1,
          startDate,
          endDate,
          pickupTime,
          returnTime,
          totalPrice: altDailyPrice * altDays,
          fulfillmentType,
        });
      }

      await sendTextMessage(psid, conflictReply);
      return { action: "CAR_UNAVAILABLE_ALTERNATIVES_OFFERED" };
    }

    // If no car matched or car is null, take the first available car
    if (!selectedCar && available.length > 0) {
      selectedCar = available[0].car;
    }

    if (!selectedCar) {
      await sendTextMessage(
        psid,
        `Hello Ma'am/Sir! We currently have no open units for ${startDate} to ${endDate}. 🚗❌\n\n` +
          `👉 Check open calendar slots here:\n${PUBLIC_AVAILABILITY_URL}\n\n` +
          `Or call our dispatch team directly at 0917 554 0394!`,
      );
      return { action: "ALL_CARS_UNAVAILABLE" };
    }

    const carId = selectedCar.id;
    const carName = `${selectedCar.brand} ${selectedCar.model} (${selectedCar.type || "Car"}, ${selectedCar.transmission || "Auto"})`;
    const dailyPrice = selectedCar.price_24_hours || 1500;
    const branchId = selectedCar.branch_id || 1;
    const days = calculateDays(startDate, endDate);
    const totalPrice = dailyPrice * days;

    // SAVE INTO SESSION AS AWAITING_CONFIRMATION (Do not insert to DB yet!)
    await saveSession(psid, {
      step: "AWAITING_CONFIRMATION",
      guestName,
      guestPhone: phone,
      guestEmail: email || undefined,
      carId,
      carName,
      carPrice: dailyPrice,
      branchId,
      startDate,
      endDate,
      pickupTime,
      returnTime,
      totalPrice,
      fulfillmentType,
    });

    const fulfillmentSummary =
      fulfillmentType === "Pickup"
        ? `• Pick-up: InstaCar Office (Pavia, Iloilo) — FREE 📍`
        : `• Fulfillment: Doorstep Delivery (Delivery fee applies based on distance)`;

    // Send summary and ask customer to confirm with "YES"
    await sendTextMessage(
      psid,
      `Hello ${guestName}! Please verify your booking details below: 📋\n\n` +
        `• Customer Name: ${guestName}\n` +
        `• Contact Number: ${phone}\n` +
        `• Selected Vehicle: ${carName}\n` +
        `• Daily Rental Rate: ₱${dailyPrice.toLocaleString()} / 24 hours\n` +
        `• Pick-up Schedule: ${startDate} (${formatClock(pickupTime)})\n` +
        `• Return Schedule: ${endDate} (${formatClock(returnTime)})\n` +
        `• Rental Duration: ${days} day(s)\n` +
        `• Total Rental Amount: ₱${totalPrice.toLocaleString()}\n` +
        `${fulfillmentSummary}\n\n` +
        `⚠️ CANCELLATION POLICY: Once confirmed and down payment is paid, reservations are strictly non-refundable.\n\n` +
        `Are all these details correct?\n` +
        `👉 Reply "YES" to confirm and submit your reservation directly to our database! 🚗\n` +
        `(Or reply if you wish to adjust any dates or details.)`,
    );

    return {
      action: "AWAITING_CONFIRMATION",
      guestName,
      carName,
      totalPrice,
    };
  }

  // -------------------------------------------------------------------------
  // STEP: AWAITING CAR SELECTION
  // -------------------------------------------------------------------------
  if (session && session.step === "AWAITING_CAR") {
    const choice = await resolveCarChoice(userText, session.startDate, session.endDate);

    if (choice?.car) {
      const car = choice.car;
      const fullCarName = `${car.brand} ${car.model} (${car.type || "Car"}, ${car.transmission || "Auto"})`;

      if (!choice.isAvailable) {
        await sendTextMessage(
          psid,
          `⚠️ Notice: ${fullCarName} is already RESERVED for your dates (${session.startDate} to ${session.endDate}). 🚗❌\n\n` +
            `👉 Please check live open dates on our calendar:\n${PUBLIC_AVAILABILITY_URL}\n\n` +
            `Or reply with another vehicle model to check availability!`,
        );
        return { action: "CHOSEN_CAR_BUSY" };
      }

      session.carId = car.id;
      session.carName = fullCarName;
      session.carPrice = car.price_24_hours || 1500;
      session.branchId = car.branch_id || 1;
      session.step = "AWAITING_FORM";
      await saveSession(psid, session);

      await sendTextMessage(
        psid,
        `Great choice! You selected: 🚗\n` +
          `• ${fullCarName} — ₱${(session.carPrice || 1500).toLocaleString()} / 24 hours (AVAILABLE 🟢)\n\n` +
          `📋 Please provide your booking details:\n` +
          `• Full Name:\n` +
          `• Contact Number:\n` +
          `• Pick-up at Office or Doorstep Delivery:\n\n` +
          `Reply with your details so we can summarize and prepare your reservation!`,
      );
      return { action: "CAR_SELECTED", carId: car.id };
    }
  }

  // -------------------------------------------------------------------------
  // DEFAULT / INITIAL INQUIRY: Live Fleet Availability for the requested dates
  // -------------------------------------------------------------------------
  const start = parsed.startDate || manilaToday();
  const end = parsed.endDate || start;

  // Query live availability comparing active bookings and maintenance schedules
  const { available, busy } = await checkFleetAvailability(start, end);

  if (available.length === 0) {
    await sendTextMessage(
      psid,
      `Hello Ma'am/Sir! We currently have no open units for ${start} to ${end}. All vehicles are fully booked. 🚗❌\n\n` +
        `👉 Check open dates and live fleet calendar anytime here:\n${PUBLIC_AVAILABILITY_URL}\n\n` +
        `Or call dispatch at 0917 554 0394!`,
    );
    return { action: "NO_CARS" };
  }

  await saveSession(psid, {
    step: "AWAITING_CAR",
    startDate: start,
    endDate: end,
  });

  let carListText = `Hello! Welcome to InstaCar Rental Services 🚗✨\n`;
  carListText += `Here is our real-time fleet availability for ${start} to ${end}:\n\n`;

  carListText += `🟢 AVAILABLE UNITS:\n`;
  available.slice(0, 7).forEach((item, idx) => {
    carListText += `${idx + 1}. ${item.car.brand} ${item.car.model} (${item.car.type || "Car"}, ${item.car.transmission || "Auto"}) — ₱${(item.car.price_24_hours || 0).toLocaleString()} / 24 hrs\n`;
  });

  if (busy.length > 0) {
    carListText += `\n🔴 CURRENTLY RESERVED / BOOKED:\n`;
    busy.slice(0, 3).forEach((item) => {
      carListText += `• ${item.car.brand} ${item.car.model} (${item.car.type || "Car"}) — Reserved\n`;
    });
  }

  carListText += `\n🌐 View our complete real-time interactive calendar:\n👉 ${PUBLIC_AVAILABILITY_URL}\n\n`;
  carListText += `💬 To book, reply with the car name or send your details in this format:\n\n`;
  carListText += `Full Name:\n`;
  carListText += `Mobile Number:\n`;
  carListText += `Preferred Vehicle:\n`;
  carListText += `Rental Dates & Time:\n`;
  carListText += `Pick-up or Delivery:`;

  await sendTextMessage(psid, carListText);
  return { action: "LISTED_CARS", availableCount: available.length, busyCount: busy.length };
}

// ---------------------------------------------------------------------------
// 4. Download ID / Photo from Meta CDN and Attach to Booking
// ---------------------------------------------------------------------------
async function processIdPhotoAndAttachToBooking(
  psid: string,
  session: BookingSession | null,
  fbImageUrl: string,
) {
  const supabase = getAdminClient();
  if (!supabase) return { error: "Database connection failed" };

  try {
    // 1. Download image from Facebook CDN
    const token = PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
    const imgRes = await fetch(fbImageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!imgRes.ok) {
      console.error("[Attachment Download Error]: HTTP", imgRes.status);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload to Supabase Storage in booking-uploads bucket
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

    // 3. Find booking to attach to
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
      let docLabel = "Valid ID";

      if (!currentBooking?.primary_id_path) {
        updateData.primary_id_path = storagePath;
        docLabel = "Primary Valid ID / Driver's License";
      } else if (!currentBooking?.proof_billing_path) {
        updateData.proof_billing_path = storagePath;
        docLabel = "Proof of Billing";
      } else if (!currentBooking?.secondary_id_path) {
        updateData.secondary_id_path = storagePath;
        docLabel = "Secondary ID";
      } else {
        updateData.proof_payment_path = storagePath;
        updateData.down_payment = 500;
        docLabel = "Proof of Down Payment (₱500)";
      }

      await supabase.from("bookings").update(updateData).eq("id", targetBookingId);

      await sendTextMessage(
        psid,
        `📸 Document received! Your ${docLabel} has been uploaded and linked to Booking #BK-${targetBookingId}.\n\n` +
          `Status: 🟡 PENDING ADMIN APPROVAL\nOur dispatch team is verifying your files and will contact you shortly to confirm! 🚗✨`,
      );

      return { action: "DOC_ATTACHED", bookingId: targetBookingId, docLabel };
    }

    // If no prior booking exists, save file and prompt user to complete details
    await saveSession(psid, {
      step: "AWAITING_FORM",
      primaryIdPath: storagePath,
    });

    await sendTextMessage(
      psid,
      `📸 Document photo saved!\n\nPlease now send your booking details (Full Name, Contact Number, Preferred Vehicle, and Dates) so we can register your reservation!`,
    );

    return { action: "DOC_SAVED_AWAITING_FORM" };
  } catch (err: any) {
    console.error("[Attachment Process Error]:", err);
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 5. Unified Fleet Availability Checker (Matching User-Side Logic)
// ---------------------------------------------------------------------------
interface CarAvailabilityInfo {
  car: {
    id: number;
    brand: string | null;
    model: string | null;
    type: string | null;
    transmission: string | null;
    price_24_hours: number | null;
    branch_id: number | null;
    status: string;
  };
  isAvailable: boolean;
  conflictReason?: string;
  conflictRange?: { start: string; end: string };
}

async function checkFleetAvailability(startDate: string, endDate: string): Promise<{
  all: CarAvailabilityInfo[];
  available: CarAvailabilityInfo[];
  busy: CarAvailabilityInfo[];
}> {
  const supabase = getAdminClient();
  if (!supabase) return { all: [], available: [], busy: [] };

  // 1. Fetch active cars
  const { data: cars } = await supabase
    .from("cars")
    .select("id, brand, model, type, transmission, price_24_hours, branch_id, status")
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
    return {
      car,
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

  // Try matching against available cars first
  const availableMatch = available.find(
    (item) =>
      item.car.model?.toLowerCase().includes(query) ||
      item.car.brand?.toLowerCase().includes(query) ||
      item.car.type?.toLowerCase().includes(query),
  );

  if (availableMatch) return availableMatch;

  // If not available, check if user specifically asked for a car that is busy
  const busyMatch = all.find(
    (item) =>
      item.car.model?.toLowerCase().includes(query) ||
      item.car.brand?.toLowerCase().includes(query) ||
      item.car.type?.toLowerCase().includes(query),
  );

  return busyMatch || null;
}

// ---------------------------------------------------------------------------
// 6. Natural Language Booking Parsing
// ---------------------------------------------------------------------------
function parseBookingDetails(text: string) {
  const segments = text.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);

  // 1. Phone number (PH formats: 09XXXXXXXXX, +639XXXXXXXXX, 10-11 digits)
  const phoneMatch = text.match(/(?:(?:\+?63|0)9\d{8,9}|\b\d{10,11}\b)/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  // 2. Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : null;

  // 3. Fulfillment type
  const isDelivery = /deliver|delivery|doorstep|ihatod/i.test(text);
  const fulfillmentType: "Pickup" | "Delivery" = isDelivery ? "Delivery" : "Pickup";

  // 4. Vehicle / Category Matching
  let vehicleQuery: string | null = null;
  const types = ["hatchback", "sedan", "suv", "mpv", "van", "pickup truck"];
  const models = [
    "wigo",
    "vios",
    "mirage",
    "city",
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

  // 5. Dates & Times Parsing
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

  if (startDate && !endDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 1);
    endDate = d.toISOString().split("T")[0];
  }

  // 6. Name extraction
  let rawName: string | null = null;
  for (const seg of segments) {
    if (phone && seg.includes(phone)) continue;
    if (email && seg.includes(email)) continue;
    if (
      /pickup|delivery|self drive|with driver|office|sa office|book|rent|hatchback|sedan|suv|mpv|van|toyota|wigo|mirage|vios|city|hi|hello/i.test(
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

async function sendTextMessage(psid: string, text: string) {
  const token = PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text },
      }),
    });
  } catch (err) {
    console.error("[Send Text Error]:", err);
  }
}
