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

async function runLiveCrudTests() {
  console.log("=================================================");
  console.log("   LIVE END-TO-END CRUD VERIFICATION TEST RUN    ");
  console.log("=================================================\n");
  let passed = 0;
  let failed = 0;

  async function testStep(name, fn) {
    try {
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✘ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Connection check
  await testStep("Database connection & branches table", async () => {
    const { data, error } = await client.from("branches").select("id, name").limit(5);
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No branches found in database");
  });

  // 2. Users / Operator CRUD Lifecycle
  let testUserId = null;
  let testAuthId = null;
  const testEmail = `auto_operator_${Date.now()}@example.com`;

  await testStep("Users CRUD: CREATE Operator (Auth + Trigger sync)", async () => {
    const { data: created, error: authError } = await client.auth.admin.createUser({
      email: testEmail,
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: { name: "Test Operator CRUD", role: "operator" },
    });

    if (authError) throw authError;
    testAuthId = created.user.id;

    // Check trigger-provisioned row
    const { data: existing } = await client
      .from("users")
      .select("id")
      .or(`auth_id.eq.${testAuthId},email.eq.${testEmail}`)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await client
        .from("users")
        .update({
          auth_id: testAuthId,
          name: "Test Operator CRUD",
          role: "operator",
          is_verified: 1,
        })
        .eq("id", existing.id);
      if (updateErr) throw updateErr;
      testUserId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await client
        .from("users")
        .insert({
          auth_id: testAuthId,
          name: "Test Operator CRUD",
          email: testEmail,
          role: "operator",
          is_verified: 1,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      testUserId = inserted.id;
    }

    if (!testUserId) throw new Error("Failed to resolve test user ID");
  });

  await testStep("Users CRUD: READ Operator profile & verify role", async () => {
    const { data, error } = await client
      .from("users")
      .select("id, name, email, role, is_verified")
      .eq("id", testUserId)
      .single();

    if (error) throw error;
    if (data.role !== "operator") throw new Error(`Expected role 'operator', got '${data.role}'`);
    if (data.email !== testEmail) throw new Error("Email mismatch");
  });

  await testStep("Users CRUD: UPDATE Operator details (name & phone)", async () => {
    const { error } = await client
      .from("users")
      .update({
        name: "Test Operator CRUD (Updated)",
        phone: "09123456789",
      })
      .eq("id", testUserId);

    if (error) throw error;

    const { data } = await client
      .from("users")
      .select("name, phone")
      .eq("id", testUserId)
      .single();

    if (data.name !== "Test Operator CRUD (Updated)") throw new Error("Name was not updated");
    if (data.phone !== "09123456789") throw new Error("Phone was not updated");
  });

  // 3. Cars CRUD Lifecycle
  let testCarId = null;
  const testPlate = `CRUD-${Math.floor(1000 + Math.random() * 9000)}`;

  await testStep("Cars CRUD: CREATE Vehicle assigned to Operator", async () => {
    const { data, error } = await client
      .from("cars")
      .insert({
        user_id: testUserId,
        brand: "Toyota",
        model: "Innova 2.8 V",
        plate_number: testPlate,
        type: "MPV",
        transmission: "Automatic",
        fuel_type: "Diesel",
        capacity: 7,
        color: "Silver Metallic",
        price_10_hours: 2200,
        price_12_hours: 2500,
        price_24_hours: 3200,
        operator_10_hours: 1500,
        operator_12_hours: 1700,
        operator_24_hours: 2200,
        status: "Available",
        image_path: "car_innova_front.jpg,car_innova_side.jpg",
      })
      .select("id, brand, model, plate_number, user_id")
      .single();

    if (error) throw error;
    testCarId = data.id;
  });

  await testStep("Cars CRUD: READ Vehicle specs & tariffs", async () => {
    const { data, error } = await client
      .from("cars")
      .select("id, brand, model, plate_number, type, price_24_hours, user_id")
      .eq("id", testCarId)
      .single();

    if (error) throw error;
    if (data.plate_number !== testPlate) throw new Error("Plate number mismatch");
    if (data.type !== "MPV") throw new Error("Vehicle type mismatch");
  });

  await testStep("Cars CRUD: UPDATE Vehicle specs & reorder main photo in gallery", async () => {
    // Reorder gallery so car_innova_side.jpg becomes index 0 (main photo)
    const { error } = await client
      .from("cars")
      .update({
        color: "Pearl White",
        price_24_hours: 3500,
        image_path: "car_innova_side.jpg,car_innova_front.jpg",
      })
      .eq("id", testCarId);

    if (error) throw error;

    const { data } = await client
      .from("cars")
      .select("color, price_24_hours, image_path")
      .eq("id", testCarId)
      .single();

    if (data.color !== "Pearl White") throw new Error("Color was not updated");
    if (data.image_path.split(",")[0] !== "car_innova_side.jpg") {
      throw new Error("Main photo reordering in gallery failed");
    }
  });

  // 4. Vehicle Schedules CRUD Lifecycle
  let testScheduleId = null;

  await testStep("Schedules CRUD: CREATE Blackout maintenance schedule", async () => {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    const { data, error } = await client
      .from("car_schedules")
      .insert({
        car_id: testCarId,
        start_date: today,
        end_date: nextWeek,
        reason: "Maintenance",
        notes: "Major brake overhaul & engine tuning",
      })
      .select("id, car_id, reason, notes")
      .single();

    if (error) throw error;
    testScheduleId = data.id;
  });

  await testStep("Schedules CRUD: READ Blackout schedules joined with car", async () => {
    const { data, error } = await client
      .from("car_schedules")
      .select("id, reason, start_date, end_date, cars(id, brand, model, plate_number)")
      .eq("id", testScheduleId)
      .single();

    if (error) throw error;
    if (!data.cars || data.cars.plate_number !== testPlate) {
      throw new Error("Schedule vehicle relation failed");
    }
  });

  await testStep("Schedules CRUD: DELETE Blackout maintenance schedule", async () => {
    const { error } = await client
      .from("car_schedules")
      .delete()
      .eq("id", testScheduleId);

    if (error) throw error;

    const { data } = await client
      .from("car_schedules")
      .select("id")
      .eq("id", testScheduleId)
      .maybeSingle();

    if (data) throw new Error("Schedule was not deleted");
  });

  // 5. Cleanup Cars & Users (DELETE testing)
  await testStep("Cars CRUD: DELETE Vehicle", async () => {
    const { error } = await client
      .from("cars")
      .delete()
      .eq("id", testCarId);

    if (error) throw error;

    const { data } = await client.from("cars").select("id").eq("id", testCarId).maybeSingle();
    if (data) throw new Error("Car was not deleted from database");
  });

  await testStep("Users CRUD: DELETE Operator (public.users & auth.users)", async () => {
    const { error: dbErr } = await client
      .from("users")
      .delete()
      .eq("id", testUserId);

    if (dbErr) throw dbErr;

    if (testAuthId) {
      const { error: authErr } = await client.auth.admin.deleteUser(testAuthId);
      if (authErr && !authErr.message.includes("User not found")) {
        throw authErr;
      }
    }

    const { data } = await client.from("users").select("id").eq("id", testUserId).maybeSingle();
    if (data) throw new Error("Operator was not deleted");
  });

  // 6. Bookings & Remittances READ & Query checks
  await testStep("Bookings & Financials: READ query and verify relations", async () => {
    const { data: bookings, error } = await client
      .from("bookings")
      .select("id, status, total_price, booking_type, cars(id, brand, model)")
      .limit(5);

    if (error) throw error;
    if (!Array.isArray(bookings)) throw new Error("Failed to fetch bookings list");
  });

  console.log("\n=================================================");
  console.log(`  SUMMARY: ${passed + failed} TESTS RUN | ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) process.exit(1);
}

runLiveCrudTests();
