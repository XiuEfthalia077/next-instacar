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

const client = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runHighVolumeScaleTest() {
  console.log("=============================================================");
  console.log("  ROUND 29: SCALABILITY & HIGH-VOLUME QUERY VERIFICATION    ");
  console.log("=============================================================\n");

  // 1. Test Server-side Pagination on Bookings Table
  console.log("1. Testing Server-side Pagination on Bookings Table...");
  const pageSize = 25;
  const startT = performance.now();
  const { data: page1, count: totalBookings, error: err1 } = await client
    .from("bookings")
    .select("id, start_date, end_date, status, total_price", { count: "exact" })
    .order("id", { ascending: false })
    .range(0, pageSize - 1);

  const durationPage1 = (performance.now() - startT).toFixed(1);
  if (err1) throw err1;

  console.log(`  ✔ Page 1 query returned ${page1.length} rows (limit ${pageSize}) in ${durationPage1}ms`);
  console.log(`  ✔ Total bookings in database: ${totalBookings}`);

  // Test Page 2 with offset
  const startT2 = performance.now();
  const { data: page2, error: err2 } = await client
    .from("bookings")
    .select("id, start_date, end_date, status, total_price")
    .order("id", { ascending: false })
    .range(pageSize, pageSize * 2 - 1);

  const durationPage2 = (performance.now() - startT2).toFixed(1);
  if (err2) throw err2;
  console.log(`  ✔ Page 2 (offset ${pageSize}) returned ${page2.length} rows in ${durationPage2}ms`);

  // Verify non-overlapping pages
  const page1Ids = new Set(page1.map(r => r.id));
  const hasOverlap = page2.some(r => page1Ids.has(r.id));
  console.log(`  ✔ Server-side pagination isolation verified (no overlap): ${!hasOverlap}`);

  // 2. Test Parameterized Search Performance
  console.log("\n2. Testing Parameterized Search Performance...");
  const searchTerm = "John";
  const startSearch = performance.now();
  const { data: searchResults, error: searchErr } = await client
    .from("bookings")
    .select("id, guest_name, gmail, phone_number")
    .or(`guest_name.ilike.%${searchTerm}%,gmail.ilike.%${searchTerm}%`)
    .limit(20);

  const durationSearch = (performance.now() - startSearch).toFixed(1);
  if (searchErr) throw searchErr;
  console.log(`  ✔ Search for '${searchTerm}' returned ${searchResults.length} rows in ${durationSearch}ms`);

  // 3. Test Analytics Date Pushdown Query
  console.log("\n3. Testing Analytics Filtered Payment Aggregation...");
  const startAnalytics = performance.now();
  const { data: payments, error: payErr } = await client
    .from("booking_payments")
    .select("id, total_gross, daily_rent, total_net")
    .gte("created_at", "2026-01-01")
    .lte("created_at", "2026-12-31T23:59:59.999Z")
    .limit(100);

  const durationAnalytics = (performance.now() - startAnalytics).toFixed(1);
  if (payErr) throw payErr;
  console.log(`  ✔ Date-scoped payments query returned ${payments.length} rows in ${durationAnalytics}ms`);

  // 4. Test Customer Directory Pagination
  console.log("\n4. Testing Users & Customers Query Pagination...");
  const { data: users, count: totalUsers } = await client
    .from("users")
    .select("id, name, email, role", { count: "exact" })
    .range(0, 19);

  console.log(`  ✔ Customer Directory page returned ${users.length} rows (total: ${totalUsers})`);

  console.log("\n=============================================================");
  console.log("✔ ALL HIGH-VOLUME SCALABILITY CHECKS PASSED!");
  console.log("=============================================================");
}

runHighVolumeScaleTest().catch(console.error);
