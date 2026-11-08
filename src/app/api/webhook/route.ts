import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { manilaToday } from "@/lib/datetime";
import { ACTIVE_CAR_STATUSES, OPEN_BOOKING_STATUSES } from "@/lib/data/legacy-status";
import { carImageUrl } from "@/lib/storage";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "instacar_messenger_verify_token_2026";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";

/**
 * 1. Meta Webhook Verification (Handshake)
 * Meta makes a GET request when you click "Verify and Save" in developers.facebook.com
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Meta Webhook] GET Handshake verified successfully!");
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return new Response("Forbidden: Invalid verify token", { status: 403 });
}

/**
 * 2. Incoming Messenger Messages (POST)
 * Fired whenever a customer messages the Facebook Page
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === "page") {
      for (const entry of body.entry ?? []) {
        const event = entry.messaging?.[0];
        if (!event) continue;

        const senderPsid = event.sender?.id;
        if (!senderPsid) continue;

        const messageText = event.message?.text?.toLowerCase() || "";
        const postbackPayload = event.postback?.payload;

        // User asks about cars, availability, or rental
        const asksForCars =
          messageText.includes("available") ||
          messageText.includes("car") ||
          messageText.includes("kotse") ||
          messageText.includes("unit") ||
          messageText.includes("rent") ||
          messageText.includes("rates") ||
          postbackPayload === "CHECK_AVAILABILITY";

        if (asksForCars) {
          await handleCarAvailabilityReply(senderPsid);
        } else if (messageText) {
          await sendTextMessage(
            senderPsid,
            "Hello! Welcome to InstaCar Car Rental Iloilo. 🚗\n\nType 'available' or ask for available cars to see our current fleet ready for booking!",
          );
        }
      }

      // Meta expects an immediate 200 OK within 5-20s
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  } catch (err: any) {
    console.error("[Meta Webhook] Error processing event:", err);
    return NextResponse.json({ status: "ERROR", error: err.message }, { status: 200 });
  }
}

/**
 * Queries available cars from Supabase and sends carousel cards directly to Messenger
 */
async function handleCarAvailabilityReply(recipientPsid: string) {
  const supabase = getAdminClient();
  const today = manilaToday();

  if (!supabase) {
    await sendTextMessage(
      recipientPsid,
      "Hi! You can view our available cars directly at https://instacar.vercel.app/#fleet",
    );
    return;
  }

  try {
    // 1. Fetch rentable cars
    const { data: cars, error } = await supabase
      .from("cars")
      .select("id, brand, model, type, transmission, price_24_hours, image_path, status")
      .in("status", ACTIVE_CAR_STATUSES)
      .order("price_24_hours", { ascending: true })
      .limit(10);

    if (error || !cars || cars.length === 0) {
      await sendTextMessage(
        recipientPsid,
        "Sorry, all vehicles are currently reserved for today! Drop your target dates and our team will check upcoming slots.",
      );
      return;
    }

    // 2. Check for conflicting bookings today
    const carIds = cars.map((c) => c.id);
    const { data: busyBookings } = await supabase
      .from("bookings")
      .select("car_id")
      .in("car_id", carIds)
      .in("status", OPEN_BOOKING_STATUSES)
      .lte("start_date", today)
      .gte("end_date", today);

    const busyIds = new Set((busyBookings || []).map((b) => b.car_id));
    const available = cars.filter((c) => !busyIds.has(c.id));

    if (available.length === 0) {
      await sendTextMessage(
        recipientPsid,
        "All our cars are currently booked for today. Please tell us your target dates (Pick-up and Return) so we can reserve an upcoming slot for you!",
      );
      return;
    }

    // 3. Build Meta Generic Template (Horizontal Carousel of Car Cards)
    const elements = available.slice(0, 8).map((car) => {
      const name = `${car.brand || ""} ${car.model || ""}`.trim();
      const photoName = car.image_path ? car.image_path.split(",")[0].trim() : "default.png";
      const photoUrl = carImageUrl(photoName || "default.png");
      const priceFormatted = car.price_24_hours
        ? `₱${car.price_24_hours.toLocaleString()}/day`
        : "Inquire for rate";

      return {
        title: name,
        subtitle: `${priceFormatted} • ${car.transmission || "Automatic"} • ${car.type || "Vehicle"}`,
        image_url: photoUrl,
        buttons: [
          {
            type: "web_url",
            url: `https://instacar.vercel.app/login?next=%2Fuser%2Fcars%3Fcar_id%3D${car.id}`,
            title: "Book This Car",
          },
        ],
      };
    });

    const payload = {
      recipient: { id: recipientPsid },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements,
          },
        },
      },
    };

    await callSendApi(payload);
  } catch (err) {
    console.error("[Meta Webhook] Failed to fetch cars:", err);
    await sendTextMessage(
      recipientPsid,
      "To check real-time available cars and book instantly, please visit: https://instacar.vercel.app/#fleet",
    );
  }
}

/**
 * Sends a plain text message to the Messenger user
 */
async function sendTextMessage(recipientPsid: string, text: string) {
  await callSendApi({
    recipient: { id: recipientPsid },
    message: { text },
  });
}

/**
 * Calls Meta Graph API Send endpoint
 */
async function callSendApi(payload: object) {
  const token = PAGE_ACCESS_TOKEN || process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.warn("[Meta Webhook] FB_PAGE_ACCESS_TOKEN not set yet.");
    return;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Meta Webhook] Send API Error:", errText);
    }
  } catch (e) {
    console.error("[Meta Webhook] Network error calling Send API:", e);
  }
}
