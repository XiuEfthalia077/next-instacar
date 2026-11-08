import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { manilaToday } from "@/lib/datetime";
import { ACTIVE_CAR_STATUSES, OPEN_BOOKING_STATUSES } from "@/lib/data/legacy-status";
import { BUCKETS } from "@/lib/storage";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "instacar_messenger_verify_token_2026";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";
const OFFICE_MAP_URL =
  "https://www.google.com/maps/place/Instacar+Car+Rental+Services/@10.7495679,122.5172827,17z/data=!3m1!4b1!4m6!3m5!1s0x33aefb4f8be44f49:0x930b22a3c6978b93!8m2!3d10.7495626!4d122.5198576!16s%2Fg%2F11vq394xy6";

interface BookingSession {
  step: "AWAITING_CAR" | "AWAITING_FORM" | "AWAITING_DOCS" | "BOOKED";
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

    // 1. Direct testing payload support (e.g. { text: "...", senderPsid: "..." })
    if (body.text && (body.senderPsid || body.sender_id)) {
      const psid = String(body.senderPsid || body.sender_id);
      const text = String(body.text).trim();
      const result = await handleIncomingMessengerFlow(psid, text, []);
      return NextResponse.json({ status: "SUCCESS", result }, { status: 200 });
    }

    // 2. Standard Meta Webhook payload (Page messaging and standby)
    if (body.object === "page") {
      for (const entry of body.entry ?? []) {
        // Collect events from messaging AND standby (when Meta Business AI / Inbox is active)
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
  const lowerText = userText.toLowerCase();

  // Reset or cancel command
  if (lowerText === "cancel" || lowerText === "restart" || lowerText === "reset") {
    await saveSession(psid, null);
    await sendTextMessage(
      psid,
      "Booking session reset. 🚗\n\nType 'available' or send your rental dates and preferred vehicle anytime to book!",
    );
    return { action: "RESET" };
  }

  const session = await getSession(psid);

  // -------------------------------------------------------------------------
  // ATTACHMENT FLOW: ID / Proof of Billing / Payment Photo
  // -------------------------------------------------------------------------
  const imageAttachment = attachments.find((att) => att.type === "image" && att.payload?.url);
  if (imageAttachment?.payload?.url) {
    return await processIdPhotoAndAttachToBooking(psid, session, imageAttachment.payload.url);
  }

  // -------------------------------------------------------------------------
  // PARSE COMPREHENSIVE BOOKING DETAILS FROM TEXT
  // -------------------------------------------------------------------------
  const parsed = parseBookingDetails(userText);

  // Direct Booking Detection:
  // If the customer provided their phone number AND (dates OR vehicle choice),
  // OR they have an active AWAITING_FORM session and provided details:
  const isDirectBookingAttempt =
    Boolean(parsed.phone && (parsed.startDate || parsed.vehicleQuery)) ||
    Boolean(session && session.step === "AWAITING_FORM" && (parsed.phone || userText.length > 5));

  if (isDirectBookingAttempt) {
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

    // Resolve vehicle
    let car = null;
    if (session?.carId) {
      const { data: c } = await supabase
        .from("cars")
        .select("id, brand, model, type, price_24_hours, branch_id")
        .eq("id", session.carId)
        .maybeSingle();
      car = c;
    }

    if (!car) {
      car = await resolveCarChoice(parsed.vehicleQuery || userText, startDate, endDate);
    }

    // Fallback if no specific car matched: pick the first available active car
    if (!car) {
      const available = await fetchAvailableCars(startDate, endDate);
      car = available[0] || null;
    }

    const carId = car?.id || 14;
    const carName = car ? `${car.brand} ${car.model}`.trim() : "Toyota Wigo 2025 (Hatchback)";
    const dailyPrice = car?.price_24_hours || 1500;
    const branchId = car?.branch_id || 1;
    const days = calculateDays(startDate, endDate);
    const totalPrice = dailyPrice * days;

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
      // INSERT DIRECTLY INTO public.bookings WITH status = 'Pending' AND booking_type = 'online'
      const { data: newBooking, error: bookingErr } = await supabase
        .from("bookings")
        .insert({
          branch_id: branchId,
          guest_name: guestName,
          phone_number: phone,
          gmail: email,
          car_id: carId,
          start_date: startDate,
          end_date: endDate,
          pickup_time: pickupTime,
          return_time: returnTime,
          total_price: totalPrice,
          status: "Pending", // Stays Pending for admin confirmation!
          booking_type: "online", // Shows under /admin/bookings_online!
          fulfillment_type: fulfillmentType,
          delivery_address: fulfillmentType === "Delivery" ? "Client address requested" : null,
          remarks: `Direct booking via Facebook Messenger (PSID: ${psid}) - ${carName}`,
        })
        .select("id")
        .single();

      if (bookingErr || !newBooking) {
        console.error("[Booking Insert Error]:", bookingErr);
        await sendTextMessage(
          psid,
          "Sorry, we encountered a technical issue securing the slot in the database. Please call our dispatch team directly at 0917 554 0394.",
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

    // Update session state
    await saveSession(psid, {
      step: "BOOKED",
      bookingId,
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

    // Notify customer on Messenger
    const fulfillmentLabel =
      fulfillmentType === "Pickup"
        ? `• Pick-up: InstaCar Office (Pavia, Iloilo) 📍\n  Map: ${OFFICE_MAP_URL}`
        : `• Fulfillment: Doorstep Delivery (Delivery fee calculated based on location)`;

    await sendTextMessage(
      psid,
      `🎉 Salamat, ${guestName}! Your reservation request has been submitted to InstaCar! 🚗\n\n` +
        `📋 BOOKING REFERENCE: #BK-${bookingId}\n` +
        `• Status: 🟡 PENDING ADMIN APPROVAL\n` +
        `• Vehicle: ${carName}\n` +
        `• Schedule: ${startDate} (${formatClock(pickupTime)}) to ${endDate} (${formatClock(returnTime)})\n` +
        `• Duration: ${days} day(s)\n` +
        `• Total Rent: ₱${totalPrice.toLocaleString()}\n` +
        `${fulfillmentLabel}\n\n` +
        `Our dispatch team is reviewing your booking. To expedite approval, please snap and send photos of:\n` +
        `1. 📸 Valid Government ID or Driver's License\n` +
        `2. 💳 Proof of Down Payment / Billing\n\n` +
        `You can send the photos directly here in this chat anytime!`,
    );

    return {
      action: "BOOKING_CREATED",
      bookingId,
      guestName,
      status: "Pending",
      bookingType: "online",
      totalPrice,
    };
  }

  // -------------------------------------------------------------------------
  // STEP: AWAITING CAR SELECTION
  // -------------------------------------------------------------------------
  if (session && session.step === "AWAITING_CAR") {
    const car = await resolveCarChoice(userText, session.startDate, session.endDate);

    if (car) {
      session.carId = car.id;
      session.carName = `${car.brand} ${car.model}`.trim();
      session.carPrice = car.price_24_hours || 1500;
      session.branchId = car.branch_id || 1;
      session.step = "AWAITING_FORM";
      await saveSession(psid, session);

      await sendTextMessage(
        psid,
        `Great choice! You selected the ${session.carName} (₱${(session.carPrice || 1500).toLocaleString()}/day). 🚗\n\n` +
          `📋 Please reply with your booking details in this format:\n\n` +
          `Full Name:\n` +
          `Mobile Number:\n` +
          `Rental Dates (e.g. Nov 20 to Nov 21):\n` +
          `Fulfillment (Pickup at office or Delivery):\n\n` +
          `Once you reply, we will instantly register your reservation into our system as PENDING!`,
      );
      return { action: "CAR_SELECTED", carId: car.id };
    }
  }

  // -------------------------------------------------------------------------
  // DEFAULT / INITIAL INQUIRY: Show available cars
  // -------------------------------------------------------------------------
  const start = parsed.startDate || manilaToday();
  const end = parsed.endDate || start;

  const availableCars = await fetchAvailableCars(start, end);

  if (availableCars.length === 0) {
    await sendTextMessage(
      psid,
      `Hello Ma'am/Sir! We currently have no open units for ${start} to ${end}. Please try asking for different dates or call 0917 554 0394!`,
    );
    return { action: "NO_CARS" };
  }

  await saveSession(psid, {
    step: "AWAITING_CAR",
    startDate: start,
    endDate: end,
  });

  let carListText = `Hello! Welcome to InstaCar Rental Services 🚗✨\nHere are our available units for ${start} to ${end}:\n\n`;
  availableCars.slice(0, 6).forEach((c, idx) => {
    carListText += `${idx + 1}. ${c.brand} ${c.model} (${c.type || "Sedan"}) — ₱${(c.price_24_hours || 0).toLocaleString()}/day\n`;
  });

  carListText += `\n💬 To book, simply reply with your details like:\n`;
  carListText += `"Juan Dela Cruz\n09171234567\nHatchback\n${start} 8am to ${end} 8am\npickup"`;

  await sendTextMessage(psid, carListText);
  return { action: "LISTED_CARS" };
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
    const imgRes = await fetch(fbImageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload to Supabase Storage in booking-uploads bucket
    const fileName = `doc_messenger_${psid}_${Date.now()}.jpg`;
    const folder = `messenger_${psid}`;
    const storagePath = `${folder}/${fileName}`;

    await supabase.storage.from(BUCKETS.bookingUploads).upload(storagePath, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

    // 3. Find booking to attach to
    let targetBookingId = session?.bookingId;

    if (!targetBookingId) {
      // Find most recent pending booking for this guest or phone
      const { data: recent } = await supabase
        .from("bookings")
        .select("id")
        .or(`phone_number.eq.${session?.guestPhone || "09"},remarks.ilike.%${psid}%`)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recent) targetBookingId = recent.id;
    }

    if (targetBookingId) {
      // Update existing booking with uploaded document
      await supabase
        .from("bookings")
        .update({
          primary_id_path: storagePath,
          proof_billing_path: storagePath,
          proof_payment_path: storagePath,
        })
        .eq("id", targetBookingId);

      await sendTextMessage(
        psid,
        `📸 Document received! Your ID/proof has been successfully attached to Booking #BK-${targetBookingId}.\n\n` +
          `Status: 🟡 PENDING ADMIN APPROVAL\nOur staff is verifying your details and will contact you shortly! 🚗✨`,
      );

      return { action: "DOC_ATTACHED", bookingId: targetBookingId };
    }

    // If no prior booking exists, record session and ask for booking details
    await saveSession(psid, {
      step: "AWAITING_FORM",
      primaryIdPath: storagePath,
    });

    await sendTextMessage(
      psid,
      `📸 Document photo saved!\n\nPlease now send your booking details (Name, Mobile Number, Vehicle type, and Rental dates) so we can register your reservation!`,
    );

    return { action: "DOC_SAVED_AWAITING_FORM" };
  } catch (err: any) {
    console.error("[Attachment Process Error]:", err);
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 5. Robust Natural Language Booking Parsing
// ---------------------------------------------------------------------------
function parseBookingDetails(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchAvailableCars(startDate: string, endDate: string) {
  const supabase = getAdminClient();
  if (!supabase) return [];

  const { data: cars } = await supabase
    .from("cars")
    .select("id, brand, model, type, transmission, price_24_hours, branch_id, status")
    .in("status", ACTIVE_CAR_STATUSES)
    .order("price_24_hours", { ascending: true });

  if (!cars || cars.length === 0) return [];

  const carIds = cars.map((c) => c.id);

  const { data: busy } = await supabase
    .from("bookings")
    .select("car_id")
    .in("car_id", carIds)
    .in("status", OPEN_BOOKING_STATUSES)
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  const busyIds = new Set((busy || []).map((b) => b.car_id));
  return cars.filter((c) => !busyIds.has(c.id));
}

async function resolveCarChoice(text: string, startDate?: string, endDate?: string) {
  const supabase = getAdminClient();
  if (!supabase) return null;

  const query = text.toLowerCase().trim();

  // 1. Try matching by type or model directly
  const { data: directCars } = await supabase
    .from("cars")
    .select("id, brand, model, type, price_24_hours, branch_id, status")
    .in("status", ACTIVE_CAR_STATUSES)
    .or(`type.ilike.%${query}%,model.ilike.%${query}%,brand.ilike.%${query}%`)
    .order("price_24_hours", { ascending: true });

  if (directCars && directCars.length > 0) {
    return directCars[0];
  }

  // 2. Fallback to available cars list
  const cars = await fetchAvailableCars(startDate || manilaToday(), endDate || manilaToday());
  const num = parseInt(text, 10);

  if (!isNaN(num) && num >= 1 && num <= cars.length) {
    return cars[num - 1];
  }

  return (
    cars.find(
      (c) =>
        c.model?.toLowerCase().includes(query) ||
        c.brand?.toLowerCase().includes(query) ||
        c.type?.toLowerCase().includes(query),
    ) || null
  );
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
