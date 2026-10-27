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

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runBookingLifecycleTest() {
  console.log("=== Testing Booking Lifecycle (Create, Update, Delete) ===");

  // 1. Get an existing car and branch
  const { data: cars } = await client.from("cars").select("id").limit(1);
  const { data: branches } = await client.from("branches").select("id").limit(1);
  const { data: users } = await client.from("users").select("id").limit(1);

  const carId = cars[0]?.id;
  const branchId = branches[0]?.id;
  const userId = users[0]?.id;

  console.log(`Using carId: ${carId}, branchId: ${branchId}, userId: ${userId}`);

  // 2. CREATE Booking
  const { data: newBooking, error: insertErr } = await client
    .from("bookings")
    .insert({
      car_id: carId,
      branch_id: branchId,
      user_id: userId,
      start_date: "2026-11-01",
      end_date: "2026-11-03",
      pickup_time: "09:00:00",
      return_time: "09:00:00",
      total_price: 5000,
      status: "Pending",
      booking_type: "online",
      fulfillment_type: "Pickup",
      guest_name: "Automated FK Test",
      phone_number: "09170000000",
      gmail: "fk_test@example.com",
    })
    .select("id, status, total_price")
    .single();

  if (insertErr) {
    console.error("CREATE FAILED:", insertErr);
    return;
  }
  console.log("✔ CREATE Successful! Booking ID:", newBooking.id);

  // 3. UPDATE Booking
  const { data: updatedBooking, error: updateErr } = await client
    .from("bookings")
    .update({
      status: "Confirmed",
      total_price: 5500,
      remarks: "Updated during FK lifecycle verification",
    })
    .eq("id", newBooking.id)
    .select("id, status, total_price, remarks")
    .single();

  if (updateErr) {
    console.error("UPDATE FAILED:", updateErr);
  } else {
    console.log("✔ UPDATE Successful! New status:", updatedBooking.status);
  }

  // 4. Test JOIN query on the newly created booking
  const { data: joined, error: joinErr } = await client
    .from("bookings")
    .select(`
      id,
      car_id,
      user_id,
      branch_id,
      cars!bookings_car_id_fkey ( id, brand, model ),
      branches!bookings_branch_id_fkey ( id, name )
    `)
    .eq("id", newBooking.id)
    .single();

  if (joinErr) {
    console.error("JOIN Query with cars & branches:", joinErr.message);
  } else {
    console.log("✔ JOIN Query with cars & branches:", joined);
  }

  // 5. Test JOIN with users!bookings_user_id_fkey
  const { data: userJoined, error: userJoinErr } = await client
    .from("bookings")
    .select("id, users!bookings_user_id_fkey(id, name)")
    .eq("id", newBooking.id)
    .single();

  if (userJoinErr) {
    console.log("✘ JOIN with users!bookings_user_id_fkey FAILED (as expected until FK is restored):", userJoinErr.message);
  } else {
    console.log("✔ JOIN with users!bookings_user_id_fkey:", userJoined);
  }

  // 6. DELETE Booking
  const { error: delErr } = await client
    .from("bookings")
    .delete()
    .eq("id", newBooking.id);

  if (delErr) {
    console.error("DELETE FAILED:", delErr);
  } else {
    console.log("✔ DELETE Successful! Cleaned up booking ID:", newBooking.id);
  }
}

runBookingLifecycleTest();
