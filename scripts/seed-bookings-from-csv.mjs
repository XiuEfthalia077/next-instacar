/**
 * Seeder Script: seed-bookings-from-csv.mjs
 * Usage: node --env-file=.env.local scripts/seed-bookings-from-csv.mjs [path-to-csv]
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function seed() {
  const csvFile = process.argv[2] || "booking_seed_template.csv";
  const filePath = path.resolve(process.cwd(), csvFile);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  console.log(`Reading booking seeding data from: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length <= 1) {
    console.warn("CSV has no data rows to seed.");
    return;
  }

  const headers = parseCSVLine(lines[0]);
  console.log("Headers detected:", headers.join(", "));

  // Pre-fetch lookups
  const { data: cars } = await supabase.from("cars").select("id, plate_number, brand, model");
  const { data: branches } = await supabase.from("branches").select("id, name");
  const { data: users } = await supabase.from("users").select("id, email, name");

  const carByPlate = new Map((cars || []).map((c) => [(c.plate_number || "").toLowerCase(), c.id]));
  const branchByName = new Map((branches || []).map((b) => [(b.name || "").toLowerCase(), b.id]));
  const userByEmail = new Map((users || []).map((u) => [(u.email || "").toLowerCase(), u.id]));

  const defaultCarId = cars?.[0]?.id || 1;
  const defaultBranchId = branches?.[0]?.id || 1;

  let insertedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    // Lookup matching foreign keys
    const plateKey = (row.car_plate_number || "").toLowerCase();
    const branchKey = (row.branch_name || "").toLowerCase();
    const emailKey = (row.customer_email || "").toLowerCase();

    const carId = carByPlate.get(plateKey) || defaultCarId;
    const branchId = branchByName.get(branchKey) || defaultBranchId;
    const userId = userByEmail.get(emailKey) || null;

    const bookingPayload = {
      booking_type: row.booking_type === "manual" ? "manual" : "online",
      car_id: carId,
      branch_id: branchId,
      user_id: userId,
      guest_name: row.guest_name || null,
      phone_number: row.phone_number || null,
      gmail: row.customer_email || null,
      start_date: row.start_date || "2026-11-01",
      pickup_time: row.pickup_time ? `${row.pickup_time}:00`.slice(0, 8) : "09:00:00",
      end_date: row.end_date || "2026-11-03",
      return_time: row.return_time ? `${row.return_time}:00`.slice(0, 8) : "18:00:00",
      fulfillment_type: row.fulfillment_type === "Delivery" ? "Delivery" : "Pickup",
      delivery_address: row.delivery_address || null,
      return_delivery_address: row.return_delivery_address || null,
      delivery_fee: Number.parseFloat(row.delivery_fee) || 0,
      pickup_fee: Number.parseFloat(row.pickup_fee) || 0,
      discount_price: Number.parseFloat(row.discount || row.discount_price) || 0,
      down_payment: Number.parseFloat(row.down_payment) || 0,
      total_price: Number.parseFloat(row.total_price) || 0,
      status: row.status || "Pending",
      remarks: row.special_instructions || row.remarks || null,
    };

    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert(bookingPayload)
      .select("id, status, total_price")
      .single();

    if (error) {
      console.error(`Row ${i} failed to insert:`, error.message);
    } else {
      insertedCount++;
      console.log(`[Success] Inserted Booking #${inserted.id} (${inserted.status}, ₱${inserted.total_price})`);
    }
  }

  console.log(`\n=== Seeding Finished: ${insertedCount} bookings created successfully. ===`);
}

seed().catch(console.error);
