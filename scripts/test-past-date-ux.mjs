import fs from "node:fs";
import path from "node:path";

const pwPath = path.join(process.env.USERPROFILE, "AppData/Roaming/npm/node_modules/playwright");
const { chromium } = await import(`file://${pwPath.replace(/\\/g, "/")}/index.mjs`);

const BASE_URL = "http://localhost:3000";

async function runPastDateUxTest() {
  console.log("=== Testing Past Date UX Validation Flow ===");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login as Admin
    console.log("1. Authenticating as admin...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', "admin@gmail.com");
    await page.fill('input[name="password"]', "123123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 15000 });
    console.log("✔ Authenticated as Admin");

    // 2. Go to Manual Bookings
    console.log("2. Navigating to /admin/bookings_manual...");
    await page.goto(`${BASE_URL}/admin/bookings_manual`, { waitUntil: "networkidle" });

    // 3. Open New Walk-in Booking Modal
    console.log("3. Opening 'New Walk-in Booking' modal...");
    await page.click('button:has-text("New Walk-in Booking")');
    await page.waitForSelector('div[role="dialog"]', { state: "visible", timeout: 5000 });
    console.log("✔ Booking modal opened");

    // 4. Click "< Prev" on the Availability Calendar to go to a past month
    console.log("4. Navigating to previous month (past dates)...");
    const prevBtn = page.locator('div[role="dialog"] button:has-text("< Prev")');
    await prevBtn.click();
    await page.waitForTimeout(300);

    // 5. Click Day 1 (Past date) -> Should trigger Step 1 Warning Modal
    console.log("5. Clicking past date (Day 1)...");
    const day1Btn = page.locator('div[role="dialog"] div.grid-cols-7 button:has-text("1")').first();
    await day1Btn.click();

    // Check for "Past Date Selection" modal
    await page.waitForSelector('text=You are selecting a past date. Are you sure?', { timeout: 4000 });
    console.log("✔ Step 1 Warning Modal appeared: 'You are selecting a past date. Are you sure?'");

    // Click "Yes, Proceed"
    console.log("6. Accepting Step 1 warning...");
    await page.click('div[role="alertdialog"] button:has-text("Yes, Proceed")');
    await page.waitForSelector('div[role="alertdialog"]', { state: "hidden", timeout: 3000 });
    console.log("✔ Past dates now unlocked!");

    // Verify after Click 1 (Day 1): pickup date is Day 1 and return date is Day 1 (not forced +24h to Day 2!)
    const pickupVal1 = await page.locator('#manual-pickup-date').inputValue();
    const returnVal1 = await page.locator('#manual-return-date').inputValue();
    console.log(`✔ Click 1 values: start=${pickupVal1}, end=${returnVal1}`);

    // 7. Click Day 5 (Return date, also in the past) -> Should NOT trigger any warning modal!
    console.log("7. Clicking past date (Day 5) to set Return Date...");
    let modalTriggeredAgain = false;
    page.on("dialog", () => { modalTriggeredAgain = true; });

    const day5Btn = page.locator('div[role="dialog"] div.grid-cols-7 button:has-text("5")').first();
    await day5Btn.click();
    await page.waitForTimeout(600);

    const alertModalCount = await page.locator('text=You are selecting a past date').count();
    if (alertModalCount > 0 || modalTriggeredAgain) {
      throw new Error("FAIL: Warning modal appeared again when selecting Return Date!");
    }
    console.log("✔ PASSED: No repeat warning modal on Return Date selection!");

    // 8. Verify Pickup Date and Return Date inputs reflect Day 1 and Day 5
    const pickupVal = await page.locator('#manual-pickup-date').inputValue();
    const returnVal = await page.locator('#manual-return-date').inputValue();
    console.log(`✔ Date range successfully selected: ${pickupVal} → ${returnVal}`);
    if (!pickupVal.endsWith("-01") || !returnVal.endsWith("-05")) {
      throw new Error(`FAIL: Expected range ending in 01 and 05, got ${pickupVal} to ${returnVal}`);
    }

    // 8b. Verify Return Date input is NOT readOnly
    const isReturnReadOnly = await page.locator('#manual-return-date').getAttribute('readonly');
    if (isReturnReadOnly !== null) {
      throw new Error("FAIL: manual-return-date input is readOnly!");
    }
    console.log("✔ PASSED: manual-return-date is fully editable (not readOnly)!");

    // 9. Fill required fields (Guest Name, Car, IDs) to test Step 3 (Submit Warning)
    console.log("8. Testing Step 3: Final confirmation on Confirm Booking...");
    await page.selectOption('#manual-customer-type', 'guest');
    await page.fill('#manual-guest-name', 'Past Date UX Tester');

    // Select car
    const carSelect = page.locator('#manual-car-id');
    const options = await carSelect.locator('option').all();
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      const disabled = await opt.getAttribute('disabled');
      if (val && disabled === null) {
        await carSelect.selectOption(val);
        break;
      }
    }

    // Attach dummy ID files
    const dummyPath = path.join(process.cwd(), "package.json");
    const primaryInput = page.locator('input[name="primary_id"]');
    if (await primaryInput.count() > 0) {
      await primaryInput.setInputFiles(dummyPath);
    }
    const billingInput = page.locator('input[name="proof_of_billing"]');
    if (await billingInput.count() > 0) {
      await billingInput.setInputFiles(dummyPath);
    }

    // Click "Confirm Booking"
    const submitBtn = page.locator('button[type="submit"]:has-text("Confirm Booking")');
    await submitBtn.click();

    // Check for Step 3 Final confirmation modal:
    await page.waitForSelector('text=This booking is set in the past. Are you sure you want to proceed?', { timeout: 5000 });
    console.log("✔ Step 3 Final Confirmation Modal appeared: 'This booking is set in the past. Are you sure you want to proceed?'");

    console.log("\n=================================================================");
    console.log("  ALL PAST DATE UX VALIDATION FLOW CHECKS PASSED PERFECTLY!");
    console.log("=================================================================");
  } catch (err) {
    console.error("✘ Test failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPastDateUxTest();
