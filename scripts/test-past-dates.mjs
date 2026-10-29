import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
  if (match && !match[1].startsWith("#")) {
    env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
  }
}

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testPastDateBooking() {
  console.log("=== Testing Past Date Booking Submission ===");

  const { data: cars } = await adminClient.from("cars").select("id").limit(1);
  const { data: branches } = await adminClient.from("branches").select("id").limit(1);

  const carId = cars[0]?.id;
  const branchId = branches[0]?.id;

  // Insert a past date walk-in booking
  const pastStartDate = "2026-10-01";
  const pastEndDate = "2026-10-03";

  const { data: newBooking, error: insertErr } = await adminClient
    .from("bookings")
    .insert({
      car_id: carId,
      branch_id: branchId,
      user_id: null,
      start_date: pastStartDate,
      end_date: pastEndDate,
      pickup_time: "08:00:00",
      return_time: "18:00:00",
      total_price: 3500,
      status: "Confirmed",
      booking_type: "manual",
      fulfillment_type: "Pickup",
      guest_name: "Past Date Test Customer",
      phone_number: "09180000000",
      gmail: "pastdate_test@example.com",
    })
    .select("id, start_date, end_date, status, booking_type")
    .maybeSingle();

  if (insertErr) {
    console.error("❌ Past date insertion failed:", insertErr);
    process.exit(1);
  }

  console.log("✔ Past date booking successfully created:", newBooking);

  // Clean up
  await adminClient.from("bookings").delete().eq("id", newBooking.id);
  console.log("✔ Past date test booking cleaned up successfully.");
}

testPastDateBooking().catch(console.error);
