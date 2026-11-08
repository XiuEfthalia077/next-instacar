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
  step: "AWAITING_CAR" | "AWAITING_FORM" | "AWAITING_DOCS";
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

    if (body.object === "page") {
      for (const entry of body.entry ?? []) {
        const event = entry.messaging?.[0];
        if (!event) continue;

        const senderPsid = event.sender?.id;
        if (!senderPsid) continue;

        const messageText = (event.message?.text || "").trim();
        const attachments = event.message?.attachments || [];

        await handleIncomingMessengerFlow(senderPsid, messageText, attachments);
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

  // Reset or cancel
  if (lowerText === "cancel" || lowerText === "restart" || lowerText === "reset") {
    await saveSession(psid, null);
    await sendTextMessage(
      psid,
      "Booking session reset. 🚗\n\nType 'available' anytime to see cars and book directly!",
    );
    return;
  }

  const session = await getSession(psid);

  // -------------------------------------------------------------------------
  // STEP: AWAITING DOCS (ID, Proof of Billing, Down Payment Photo)
  // -------------------------------------------------------------------------
  if (session && session.step === "AWAITING_DOCS") {
    const imageAttachment = attachments.find((att) => att.type === "image" && att.payload?.url);

    if (imageAttachment?.payload?.url) {
      await processIdPhotoAndFinalizeBooking(psid, session, imageAttachment.payload.url);
      return;
    }

    // Customer sent text without uploading requirements
    await sendTextMessage(
      psid,
      `⚠️ We are holding your slot, ${session.guestName || "Ma'am/Sir"}!\n\n` +
        `To confirm your reservation in our database, please send your requirements:\n` +
        `1. 📸 Valid Government ID or Driver's License\n` +
        `2. 📸 Proof of Billing\n` +
        `3. 💳 Proof of Down Payment (GCash / Bank receipt)\n\n` +
        `Just snap a photo and send it directly here in this chat!`,
    );
    return;
  }

  // -------------------------------------------------------------------------
  // STEP: AWAITING FORM DETAILS (Name, Phone, Dates, Times, Fulfillment)
  // -------------------------------------------------------------------------
  if (session && session.step === "AWAITING_FORM") {
    // Parse user input
    const phoneMatch = userText.match(/(09\d{9}|\+?639\d{9})/);
    const phone = phoneMatch ? phoneMatch[0] : "";
    const emailMatch = userText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "";

    const isDelivery = lowerText.includes("delivery") || lowerText.includes("deliver");
    const fulfillmentType: "Pickup" | "Delivery" = isDelivery ? "Delivery" : "Pickup";

    // Extract dates if mentioned, or keep previous
    const dates = extractDatesFromText(lowerText);
    const startDate = dates.start || session.startDate || manilaToday();
    const endDate = dates.end || session.endDate || startDate;
    const days = calculateDays(startDate, endDate);

    // Extract customer name
    let cleanName = userText;
    if (phone) cleanName = cleanName.replace(phone, "");
    if (email) cleanName = cleanName.replace(email, "");
    cleanName = cleanName.replace(/(pickup|delivery|self drive|with driver|office)/gi, "").trim();
    const guestName = cleanName.split("\n")[0]?.slice(0, 50).trim() || session.guestName || "Customer";

    session.guestName = guestName;
    session.guestPhone = phone || session.guestPhone || "09170000000";
    session.guestEmail = email || session.guestEmail || "";
    session.startDate = startDate;
    session.endDate = endDate;
    session.pickupTime = "08:00:00";
    session.returnTime = "08:00:00";
    session.fulfillmentType = fulfillmentType;
    session.totalPrice = (session.carPrice || 1800) * days;
    session.step = "AWAITING_DOCS";
    await saveSession(psid, session);

    const fulfillmentDetails =
      fulfillmentType === "Pickup"
        ? `• Fulfillment: Branch Pick-up (FREE)\n  📍 InstaCar Main Office: ${OFFICE_MAP_URL}`
        : `• Fulfillment: Doorstep Delivery (Delivery fee applies based on distance)`;

    await sendTextMessage(
      psid,
      `Thank you, ${guestName}! I have recorded your booking details: 👍\n\n` +
        `📋 RESERVATION SUMMARY:\n` +
        `• Vehicle: ${session.carName}\n` +
        `• Schedule: ${startDate} (8:00 AM) to ${endDate} (8:00 AM)\n` +
        `${fulfillmentDetails}\n` +
        `• Estimated Rental Total: ₱${session.totalPrice.toLocaleString()}\n\n` +
        `⚠️ TO CONFIRM & INSERT YOUR BOOKING INTO OUR SYSTEM:\n\n` +
        `Please send the following requirements right here in this chat:\n` +
        `1. 📸 Valid Government ID / Driver's License\n` +
        `2. 📸 Proof of Billing\n` +
        `3. 💳 Proof of Down Payment (GCash or Bank transfer receipt)\n\n` +
        `Once sent, your reservation will be submitted directly to our admin system as PENDING for confirmation! 🚗`,
    );
    return;
  }

  // -------------------------------------------------------------------------
  // STEP: AWAITING CAR SELECTION
  // -------------------------------------------------------------------------
  if (session && session.step === "AWAITING_CAR") {
    const car = await resolveCarChoice(userText, session.startDate, session.endDate);

    if (car) {
      session.carId = car.id;
      session.carName = `${car.brand} ${car.model}`.trim();
      session.carPrice = car.price_24_hours || 1800;
      session.branchId = car.branch_id || 1;
      session.step = "AWAITING_FORM";
      await saveSession(psid, session);

      await sendTextMessage(
        psid,
        `Great choice! You selected the ${session.carName} (₱${(session.carPrice || 1800).toLocaleString()}/day). 🚗\n\n` +
          `📋 Please send us your booking details in this format:\n\n` +
          `• Full Name:\n` +
          `• Mobile Number:\n` +
          `• Email (Optional):\n` +
          `• Pick-up Date & Time:\n` +
          `• Return Date & Time:\n` +
          `• Fulfillment (Pickup or Delivery):\n` +
          `  - If Pickup (FREE at Office): ${OFFICE_MAP_URL}\n` +
          `  - If Delivery (Fee applies based on distance)\n` +
          `• Self-Drive or With Driver:\n\n` +
          `Reply with your details to proceed!`,
      );
      return;
    }
  }

  // -------------------------------------------------------------------------
  // DEFAULT / INITIAL INQUIRY (Query cars from Supabase)
  // -------------------------------------------------------------------------
  const dates = extractDatesFromText(lowerText);
  const start = dates.start || manilaToday();
  const end = dates.end || start;

  const availableCars = await fetchAvailableCars(start, end);

  if (availableCars.length === 0) {
    await sendTextMessage(
      psid,
      `Hello Ma'am/Sir! We currently have no open units for ${start} to ${end}. Please try asking for different dates!`,
    );
    return;
  }

  // Save session as AWAITING_CAR
  await saveSession(psid, {
    step: "AWAITING_CAR",
    startDate: start,
    endDate: end,
  });

  let carListText = `Hello Ma'am/Sir! Here are our available units for ${start} to ${end}:\n\n`;
  availableCars.slice(0, 6).forEach((c, idx) => {
    carListText += `${idx + 1}. ${c.brand} ${c.model} (${c.transmission || "Auto"}) — ₱${(c.price_24_hours || 0).toLocaleString()}/day\n`;
  });

  carListText += `\n💬 To book directly, reply with the number or car name (e.g., '1' or 'Mirage')!`;

  await sendTextMessage(psid, carListText);
}

// ---------------------------------------------------------------------------
// 4. Download ID / Payment Photo from Meta CDN and Save Booking to Supabase
// ---------------------------------------------------------------------------
async function processIdPhotoAndFinalizeBooking(psid: string, session: BookingSession, fbImageUrl: string) {
  const supabase = getAdminClient();
  if (!supabase) {
    await sendTextMessage(psid, "Database connection error. Please contact our hotline: 0917 554 0394.");
    return;
  }

  try {
    await sendTextMessage(psid, "Uploading your documents and securing your booking in our system... ⏳");

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

    // 3. Insert into public.bookings table with status = 'Pending'
    const { data: newBooking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        branch_id: session.branchId || 1,
        guest_name: session.guestName || "Messenger Customer",
        phone_number: session.guestPhone || null,
        gmail: session.guestEmail || null,
        car_id: session.carId,
        start_date: session.startDate,
        end_date: session.endDate,
        pickup_time: session.pickupTime || "08:00:00",
        return_time: session.returnTime || "08:00:00",
        total_price: session.totalPrice || session.carPrice || 1800,
        status: "Pending", // Stays Pending for Admin confirmation!
        booking_type: "online",
        fulfillment_type: session.fulfillmentType || "Pickup",
        delivery_address: session.deliveryAddress || null,
        return_delivery_address: session.returnDeliveryAddress || null,
        primary_id_path: storagePath,
        proof_billing_path: storagePath,
        proof_payment_path: storagePath,
        remarks: `Direct booking via Facebook Messenger (PSID: ${psid})`,
      })
      .select("id")
      .maybeSingle();

    if (bookingErr || !newBooking) {
      console.error("[Booking Insert Error]:", bookingErr);
      await sendTextMessage(
        psid,
        "Sorry, we encountered an issue securing the slot in the database. Please call our dispatch team directly at 0917 554 0394.",
      );
      return;
    }

    const bookingId = newBooking.id;

    // 4. Insert into public.booking_payments table
    await supabase.from("booking_payments").insert({
      booking_id: bookingId,
      daily_rent: session.carPrice || 1800,
      total_gross: session.totalPrice || session.carPrice || 1800,
      total_net: session.totalPrice || session.carPrice || 1800,
      operator_share: 0,
    });

    // 5. Clear conversation session
    await saveSession(psid, null);

    // 6. Send confirmation to user
    await sendTextMessage(
      psid,
      `🎉 BOOKING SUBMITTED DIRECTLY TO SYSTEM!\n\n` +
        `📋 BOOKING REFERENCE: #BK-${bookingId}\n` +
        `• Customer: ${session.guestName}\n` +
        `• Vehicle: ${session.carName}\n` +
        `• Rental Dates: ${session.startDate} to ${session.endDate}\n` +
        `• Total Amount: ₱${(session.totalPrice || 0).toLocaleString()}\n` +
        `• Status: 🟡 PENDING ADMIN APPROVAL\n\n` +
        `Your verification documents and booking details have been registered into our database! ` +
        `Our admin team is reviewing your down payment and ID now to confirm your reservation. Thank you for choosing InstaCar! 🚗✨`,
    );
  } catch (err: any) {
    console.error("[Booking Finalize Error]:", err);
    await sendTextMessage(
      psid,
      "An unexpected error occurred while finalizing your reservation. Please contact us at 0917 554 0394.",
    );
  }
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
  const cars = await fetchAvailableCars(startDate || manilaToday(), endDate || manilaToday());
  const num = parseInt(text, 10);

  if (!isNaN(num) && num >= 1 && num <= cars.length) {
    return cars[num - 1];
  }

  const query = text.toLowerCase();
  return cars.find(
    (c) =>
      c.model?.toLowerCase().includes(query) ||
      c.brand?.toLowerCase().includes(query) ||
      c.type?.toLowerCase().includes(query),
  );
}

function calculateDays(start?: string, end?: string): number {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff || 1);
}

function extractDatesFromText(text: string): { start?: string; end?: string } {
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoMatch && isoMatch.length >= 2) {
    return { start: isoMatch[0], end: isoMatch[1] };
  }
  if (isoMatch && isoMatch.length === 1) {
    return { start: isoMatch[0], end: isoMatch[0] };
  }
  return {};
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
