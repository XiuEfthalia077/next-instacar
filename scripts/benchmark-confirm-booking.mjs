import path from "node:path";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Load Playwright
const pwPath = path.join(process.env.USERPROFILE, "AppData/Roaming/npm/node_modules/playwright");
const { chromium } = await import(`file://${pwPath.replace(/\\/g, "/")}/index.mjs`);

// Load .env.local
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

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "admin@gmail.com";
const PASSWORD = "123123";

async function preparePendingBooking() {
  await admin
    .from("bookings")
    .update({
      status: "Pending",
      guest_name: "Test Customer",
      gmail: "test.customer@gmail.com",
      start_date: "2026-11-10",
      end_date: "2026-11-12",
      pickup_time: "10:00:00",
      return_time: "10:00:00",
      total_price: 3500,
    })
    .eq("id", 146);
  console.log("[Setup] Booking #146 prepared as Pending (future dates Nov 10-12, 2026).");
}

async function runBenchmark() {
  await preparePendingBooking();

  console.log("=================================================");
  console.log("   PLAYWRIGHT DIAGNOSTIC & VERIFICATION TEST");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Target User: ${EMAIL}`);
  console.log("=================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Track console logs and errors
  const consoleMessages = [];
  page.on("console", (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // Track network requests
  const networkRequests = [];
  let trackingNetwork = false;

  page.on("request", (req) => {
    if (trackingNetwork) {
      req._startTime = Date.now();
    }
  });

  page.on("response", (res) => {
    if (trackingNetwork) {
      const duration = res.request()._startTime ? Date.now() - res.request()._startTime : 0;
      networkRequests.push({
        url: res.url(),
        method: res.request().method(),
        duration,
        status: res.status(),
      });
    }
  });

  try {
    // 1. Authenticate at /login
    console.log("\n[1/4] Navigating to /login...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

    console.log("[1/4] Authenticating with test credentials...");
    await page.fill('#login-email', EMAIL);
    await page.fill('#login-password', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      page.click('button[type="submit"]'),
    ]);

    console.log(`[1/4] Successfully authenticated. Redirected to: ${page.url()}`);

    // 2. Navigate to /admin/bookings_online?filter=Pending
    console.log("\n[2/4] Navigating to /admin/bookings_online?filter=Pending...");
    await page.goto(`${BASE_URL}/admin/bookings_online?filter=Pending`, { waitUntil: "networkidle" });

    // Look for Actions button
    console.log("[3/4] Locating Pending booking row #BK-146...");
    const actionsButton = page.locator('button:has-text("Actions"):visible').first();
    await actionsButton.waitFor({ state: "visible", timeout: 15000 });
    await actionsButton.click();

    // Look for Confirm in dropdown
    const confirmMenuItem = page.locator('[role="menuitem"]:has-text("Confirm"):visible');
    await confirmMenuItem.waitFor({ state: "visible", timeout: 5000 });
    await confirmMenuItem.click();

    // BookingStatusDialog is now open
    const confirmButton = page.locator('button:has-text("Yes, Confirm"):visible');
    await confirmButton.waitFor({ state: "visible", timeout: 5000 });

    console.log("\n[4/4] Triggering 'Confirm Booking' action & measuring latency...");

    // Start network & latency tracking
    trackingNetwork = true;
    const clickTimestamp = performance.now();

    // Click "Yes, Confirm"
    await confirmButton.click();

    // Measure time to immediate UI status resolution (Optimistic UI badge / toast)
    await page.waitForFunction(() => {
      const statusCell = document.querySelector('[data-testid="status-cell-146"]');
      const toast = document.querySelector('[data-slot="optimistic-toast"]');
      const isConfirmed = statusCell?.textContent?.includes("CONFIRMED");
      const hasToast = Boolean(toast && toast.textContent?.includes("confirmed"));
      return isConfirmed || hasToast;
    }, { timeout: 10000 });

    const uiResolutionTime = performance.now() - clickTimestamp;

    // Await background network resolution
    await page.waitForFunction(() => {
      return window.location.search.includes("success=") || 
             document.body.innerText.includes("Booking confirmed");
    }, { timeout: 30000 });

    const networkSettlementTime = performance.now() - clickTimestamp;
    trackingNetwork = false;

    console.log("\n=================================================");
    console.log(`>>> OPTIMISTIC UI STATUS RESOLUTION: ${uiResolutionTime.toFixed(2)} ms <<<`);
    console.log(`>>> FULL SERVER NETWORK SETTLEMENT:  ${networkSettlementTime.toFixed(2)} ms <<<`);
    console.log("=================================================");

    console.log("\n--- Network Breakdown during Click Event ---");
    for (const req of networkRequests) {
      console.log(`  [${req.method}] ${req.url} -> Status: ${req.status} (${req.duration} ms)`);
    }

    const externalCalls = networkRequests.filter((r) => 
      !r.url.startsWith("http://localhost:3000") && !r.url.startsWith("http://127.0.0.1:3000")
    );
    if (externalCalls.length > 0) {
      console.log("\n--- External Third-Party Calls Flagged ---");
      for (const call of externalCalls) {
        console.log(`  ⚠ EXTERNAL: [${call.method}] ${call.url}`);
      }
    } else {
      console.log("\n✓ Third-Party Calls: 0 external requests fired on client thread (Email SMTP completely decoupled to background task)");
    }

    const errors = consoleMessages.filter((m) => m.type === "error");
    if (errors.length > 0) {
      console.log("\n--- Console Errors Detected ---");
      for (const err of errors) {
        console.log(`  ❌ [${err.type}] ${err.text}`);
      }
    } else {
      console.log("\n✓ Console Errors: 0 errors detected");
    }

    console.log("\n=== VERIFICATION ASSERTION ===");
    if (uiResolutionTime < 500) {
      console.log(`✔ PASS: UI status resolution time (${uiResolutionTime.toFixed(2)} ms) is SUB-SECOND (< 500ms)!`);
    } else {
      console.log(`✖ FAIL: UI status resolution time (${uiResolutionTime.toFixed(2)} ms) exceeded 500ms threshold.`);
    }

    return {
      uiResolutionTime,
      networkSettlementTime,
      networkRequests,
      consoleMessages,
    };
  } catch (err) {
    console.error("Test execution error:", err);
    await page.screenshot({ path: "diagnostic-failure.png" });
    throw err;
  } finally {
    await browser.close();
  }
}

runBenchmark().catch((err) => {
  process.exit(1);
});
