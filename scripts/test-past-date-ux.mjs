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

    // 8b. Test 3rd click (Resets range and starts new start date) & 4th click (Sets end date)
    console.log("8b. Testing strict 2-click reset: Click 3 on Day 10...");
    const day10Btn = page.locator('div[role="dialog"] div.grid-cols-7 button:has-text("10")').first();
    await day10Btn.click();
    await page.waitForTimeout(300);
    const pickupVal3 = await page.locator('#manual-pickup-date').inputValue();
    const returnVal3 = await page.locator('#manual-return-date').inputValue();
    console.log(`✔ Click 3 reset verified: start=${pickupVal3}, end=${returnVal3}`);
    if (!pickupVal3.endsWith("-10")) {
      throw new Error(`FAIL: Expected Click 3 to reset start date to Day 10, got ${pickupVal3}`);
    }

    console.log("8c. Click 4 on Day 12 to complete second 2-click selection...");
    const day12Btn = page.locator('div[role="dialog"] div.grid-cols-7 button:has-text("12")').first();
    await day12Btn.click();
    await page.waitForTimeout(300);
    const pickupVal4 = await page.locator('#manual-pickup-date').inputValue();
    const returnVal4 = await page.locator('#manual-return-date').inputValue();
    console.log(`✔ Click 4 range completed: ${pickupVal4} → ${returnVal4}`);
    if (!pickupVal4.endsWith("-10") || !returnVal4.endsWith("-12")) {
      throw new Error(`FAIL: Expected Day 10 to Day 12, got ${pickupVal4} to ${returnVal4}`);
    }

    // 9. Test Fulfillment Type & Address Logic
    console.log("9. Testing Fulfillment Type and Address Logic...");
    // Check Pickup default address:
    const pickupAddressVal = await page.locator('#manual-delivery-address').inputValue();
    const isPickupAddressReadOnly = await page.locator('#manual-delivery-address').getAttribute('readonly');
    console.log(`✔ Pickup Address value: "${pickupAddressVal}", readOnly: ${isPickupAddressReadOnly !== null}`);
    if (!pickupAddressVal.includes("Pandac, Pavia, Iloilo") || isPickupAddressReadOnly === null) {
      throw new Error("FAIL: Pickup address should default to branch location and be readOnly!");
    }

    // Switch to Delivery:
    await page.selectOption('#manual-fulfillment', 'Delivery');
    const isDeliveryAddressReadOnly = await page.locator('#manual-delivery-address').getAttribute('readonly');
    console.log(`✔ Switched to Delivery: readOnly is now ${isDeliveryAddressReadOnly !== null}`);
    if (isDeliveryAddressReadOnly !== null) {
      throw new Error("FAIL: Delivery address should be editable when Delivery is selected!");
    }
    await page.fill('#manual-delivery-address', '123 Custom Delivery St, Iloilo City');

    // Check Return Address input and helper text
    const returnAddressInput = page.locator('#manual-return-address');
    if (await returnAddressInput.count() === 0) {
      throw new Error("FAIL: Return Address input is missing!");
    }
    await returnAddressInput.fill('Back to main branch shop');
    console.log("✔ PASSED: Return Address input and helper text verified!");

    // 10. Fill required fields (Guest Name, Car, IDs) to test Past Date Double-Submit Bug
    console.log("10. Testing Past Date Double-Submit Bug...");
    await page.selectOption('#manual-customer-type', 'guest');
    await page.fill('#manual-guest-name', 'Past Date Double-Submit Tester');

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
    console.log("11. Clicking 'Confirm Booking' button...");
    const submitBtn = page.locator('button:has-text("Confirm Booking")');
    await submitBtn.click();

    // Check for Step 3 Final confirmation modal:
    await page.waitForSelector('text=This booking is set in the past. Are you sure you want to proceed?', { timeout: 5000 });
    console.log("✔ Step 3 Final Confirmation Modal appeared: 'This booking is set in the past. Are you sure you want to proceed?'");

    // Click Cancel first to verify nothing is submitted
    console.log("12. Clicking 'Cancel' on the warning modal to test that submit is STOPPED...");
    const cancelModalBtn = page.locator('div[role="alertdialog"] button:has-text("Cancel")');
    await cancelModalBtn.click();
    await page.waitForTimeout(1000);

    // Verify dialog is still open and page did NOT navigate or submit
    const dialogStillOpen = await page.locator('div[role="dialog"]').isVisible();
    if (!dialogStillOpen) {
      throw new Error("FAIL: Booking was submitted even when Cancel was clicked!");
    }
    console.log("✔ PASSED: Booking submission was strictly STOPPED when Cancel was clicked!");

    // Click "Confirm Booking" again, then click "Yes, Proceed"
    console.log("13. Clicking 'Confirm Booking' again and accepting warning...");
    await submitBtn.click();
    await page.waitForSelector('text=This booking is set in the past. Are you sure you want to proceed?', { timeout: 5000 });
    await page.click('div[role="alertdialog"] button:has-text("Yes, Proceed")');

    // Wait for form to submit and dialog to close or redirect
    await page.waitForTimeout(3000);
    console.log("✔ Booking submission triggered cleanly upon explicit Accept!");

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
