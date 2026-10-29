import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
    if (match && !match[1].startsWith("#")) {
      const key = match[1];
      const val = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runConcurrencyStressTest() {
  console.log("=============================================================");
  console.log("  ROUND 29: CONCURRENCY & RACE CONDITION STRESS TEST (50-100)");
  console.log("=============================================================\n");

  // 1. Pick a test vehicle
  const { data: cars, error: carErr } = await client
    .from("cars")
    .select("id, brand, model, branch_id")
    .eq("status", "Available")
    .limit(1);

  if (carErr || !cars || cars.length === 0) {
    console.error("No available car found for testing:", carErr);
    process.exit(1);
  }

  const targetCar = cars[0];
  console.log(`Target Vehicle: #${targetCar.id} ${targetCar.brand} ${targetCar.model}`);

  // Test date far in the future to avoid conflicting with actual bookings
  const testStartDate = "2029-05-10";
  const testEndDate = "2029-05-15";

  // Clean up any leftovers from previous test runs on this vehicle/date
  await client
    .from("bookings")
    .delete()
    .eq("car_id", targetCar.id)
    .eq("start_date", testStartDate)
    .eq("end_date", testEndDate);

  const CONCURRENCY_COUNT = 100;
  console.log(`\nSimulating ${CONCURRENCY_COUNT} concurrent users clicking 'Confirm Booking' at the exact same millisecond...`);

  // We import the concurrency mutex directly to test the serialization guarantee
  const { bookingMutex } = await import("../src/lib/concurrency.ts");

  let successCount = 0;
  let collisionCount = 0;
  let errorCount = 0;
  const createdBookingIds = [];

  const startTimes = [];

  // Function simulating a single concurrent booking request through the mutex & overlap pipeline
  async function simulateUserBookingAttempt(userId) {
    const start = Date.now();
    startTimes.push(start);

    // Acquire vehicle lock
    const release = await bookingMutex.lock(`car:${targetCar.id}`);
    try {
      // Overlap check inside critical section
      const { data: existing } = await client
        .from("bookings")
        .select("id")
        .eq("car_id", targetCar.id)
        .not("status", "in", "(Cancelled,Completed)")
        .lte("start_date", testEndDate)
        .gte("end_date", testStartDate);

      if (existing && existing.length > 0) {
        collisionCount++;
        return { status: "COLLISION_REJECTED", user: userId };
      }

      // Insert booking
      const { data: inserted, error: insertErr } = await client
        .from("bookings")
        .insert({
          car_id: targetCar.id,
          branch_id: targetCar.branch_id,
          start_date: testStartDate,
          end_date: testEndDate,
          pickup_time: "10:00:00",
          return_time: "10:00:00",
          total_price: 5000,
          status: "Confirmed",
          booking_type: "online",
          guest_name: `Stress Test User ${userId}`,
        })
        .select("id")
        .single();

      if (insertErr) {
        errorCount++;
        return { status: "ERROR", error: insertErr.message, user: userId };
      }

      successCount++;
      createdBookingIds.push(inserted.id);
      return { status: "SUCCESS", id: inserted.id, user: userId };
    } finally {
      release();
    }
  }

  // Launch all CONCURRENCY_COUNT attempts simultaneously using Promise.all
  const promises = Array.from({ length: CONCURRENCY_COUNT }, (_, i) =>
    simulateUserBookingAttempt(i + 1),
  );

  const results = await Promise.all(promises);

  console.log("\n--- Stress Test Execution Results ---");
  console.log(`Total Concurrent Requests: ${CONCURRENCY_COUNT}`);
  console.log(`Successful Bookings:       ${successCount}`);
  console.log(`Clean Collisions Prevented: ${collisionCount}`);
  console.log(`Unhandled Server Errors:   ${errorCount}`);

  // Verification in Database
  const { data: dbRecords } = await client
    .from("bookings")
    .select("id, start_date, end_date, car_id, guest_name")
    .eq("car_id", targetCar.id)
    .eq("start_date", testStartDate)
    .eq("end_date", testEndDate);

  console.log(`\nVerifying database state for Car #${targetCar.id} on ${testStartDate} to ${testEndDate}:`);
  console.log(`Total database rows found: ${dbRecords?.length ?? 0}`);

  // Cleanup test booking
  if (createdBookingIds.length > 0) {
    await client.from("bookings").delete().in("id", createdBookingIds);
    console.log(`Cleaned up ${createdBookingIds.length} test booking record(s).`);
  }

  if (successCount === 1 && collisionCount === CONCURRENCY_COUNT - 1 && dbRecords?.length === 1) {
    console.log(`\n✔ [PASS] Concurrency stress test PASSED: Exactly 1 booking succeeded, ${collisionCount} rejected cleanly with zero double-booking!`);
    return true;
  } else {
    console.error("\n✘ [FAIL] Concurrency stress test FAILED! Double booking occurred or unexpected errors.");
    process.exit(1);
  }
}

runConcurrencyStressTest();
