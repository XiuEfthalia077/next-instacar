import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Load Playwright
const pwPath = path.join(process.env.USERPROFILE, "AppData/Roaming/npm/node_modules/playwright");
const { chromium } = await import(`file://${pwPath.replace(/\\/g, "/")}/index.mjs`);

// Load environment config
const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
  if (match && !match[1].startsWith("#")) {
    env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
  }
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_EMAIL = "ramesesjay1@gmail.com";

async function run() {
  console.log("=== Playwright End-to-End Test: OTP Password Reset Flow ===");
  console.log(`Target: http://localhost:3000/user/forgot for ${TEST_EMAIL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to /user/forgot
    console.log("1. Navigating to /user/forgot...");
    await page.goto("http://localhost:3000/user/forgot", { waitUntil: "networkidle" });

    const title = await page.title();
    console.log("Page title:", title);

    // 2. Step 1: Input email
    console.log(`2. Entering email: ${TEST_EMAIL}...`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');

    // 3. Wait for Step 2 UI (OTP verification)
    console.log("3. Waiting for Step 2 (Verify OTP UI)...");
    await page.waitForSelector('input#otp-code', { timeout: 15000 });
    console.log("Step 2 rendered successfully! Waiting for OTP persistence in database...");

    // Wait a brief moment for DB update
    await page.waitForTimeout(2000);

    // 4. Retrieve hashed OTP from public.users table
    const { data: userRow, error: uErr } = await admin
      .from("users")
      .select("id, email, reset_token, token_expiry")
      .eq("email", TEST_EMAIL)
      .maybeSingle();

    if (uErr || !userRow || !userRow.reset_token) {
      throw new Error(`Failed to read reset_token from database: ${JSON.stringify(uErr || userRow)}`);
    }

    console.log("DB reset_token value:", userRow.reset_token);
    const targetHash = userRow.reset_token.replace(/^otp:/, "");

    // 5. Reverse the 6-digit OTP
    console.log("Reversing 6-digit OTP from hash...");
    let foundOtp = null;
    for (let i = 100000; i <= 999999; i++) {
      const h = crypto.createHash("sha256").update(String(i)).digest("hex");
      if (h === targetHash) {
        foundOtp = String(i);
        break;
      }
    }

    if (!foundOtp) {
      throw new Error("Could not reverse OTP from hash within 6-digit space!");
    }
    console.log(`Successfully resolved active OTP: ${foundOtp}`);

    // 6. Enter OTP into Playwright input
    console.log(`6. Filling OTP ${foundOtp} into #otp-code...`);
    await page.fill("#otp-code", foundOtp);

    // Click "Verify & Continue"
    console.log("7. Clicking 'Verify & Continue'...");
    await page.click('button[type="submit"]');

    // 7. Wait for Step 3: "New Password"
    console.log("8. Waiting for Step 3: New Password form...");
    await page.waitForSelector('input#new-password', { timeout: 15000 });
    console.log("SUCCESS! Step 3 (New Password) rendered without errors!");

    // Take screenshot of Step 3 for artifact evidence
    const screenshotPath = path.resolve("../step3_verified.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Saved verification screenshot to:", screenshotPath);

    console.log("=== ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
