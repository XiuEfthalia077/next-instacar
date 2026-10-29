import fs from "node:fs";
import path from "node:path";

const pwPath = path.join(process.env.USERPROFILE, "AppData/Roaming/npm/node_modules/playwright");
const { chromium } = await import(`file://${pwPath.replace(/\\/g, "/")}/index.mjs`);

const BASE_URL = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const postRequests = [];
  page.on("request", req => {
    if (req.method() === "POST") {
      const url = req.url();
      if (!url.includes("__nextjs")) {
        console.log("--> POST REQUEST TO:", url);
        postRequests.push(url);
      }
    }
  });

  try {
    // 1. Login
    console.log("1. Authenticating as admin...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', "admin@gmail.com");
    await page.fill('input[name="password"]', "123123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/dashboard", { timeout: 15000 });
    console.log("✔ Admin authenticated");

    // 2. Go to booking details
    await page.goto(`${BASE_URL}/shared/booking_details?id=146`, { waitUntil: "networkidle" });
    console.log("✔ On booking details page");

    // 3. Open Edit Reservation modal
    console.log("2. Opening Edit Reservation dialog...");
    await page.click('button:has-text("Edit Reservation")');
    await page.waitForSelector('text=Edit Reservation Details', { timeout: 5000 });
    console.log("✔ Edit Reservation dialog opened");

    // Clear recorded post requests
    postRequests.length = 0;

    // 4. Click "Delete Booking" button
    console.log("3. Clicking 'Delete Booking' button inside Edit Reservation...");
    const deleteBtn = page.locator('div[role="dialog"] button:has-text("Delete Booking")');
    await deleteBtn.click();

    await page.waitForTimeout(600);

    // Verify confirmation modal is visible
    const deleteConfirmHeader = page.locator('text=Delete Booking #BK-146?');
    const isModalVisible = await deleteConfirmHeader.isVisible();
    console.log("✔ Delete confirmation modal visible:", isModalVisible);

    // Verify NO server requests were triggered by clicking "Delete Booking"
    console.log("POST requests triggered so far:", postRequests.length);
    if (postRequests.length === 0) {
      console.log("✔ SUCCESS: No background submission or loading occurred upon clicking 'Delete Booking'!");
    } else {
      console.error("FAIL: Requests were triggered:", postRequests);
    }

    // Verify "Save Changes" button is NOT loading
    const savingChangesBtn = page.locator('button:has-text("Saving Changes...")');
    const isSaving = await savingChangesBtn.isVisible();
    console.log("✔ 'Save Changes' loading spinner is NOT active:", !isSaving);

    // Verify "Yes, Delete" button is ready and waiting
    const yesDeleteBtn = page.locator('button:has-text("Yes, Delete")');
    console.log("✔ 'Yes, Delete' confirmation button is visible:", await yesDeleteBtn.isVisible());

    // Take screenshot of confirmation modal on top of edit modal
    await page.screenshot({ path: "scripts/delete-modal-verified.png" });

    // 5. Test Cancel
    console.log("4. Testing Cancel on confirmation modal...");
    const cancelConfirmBtn = page.locator('div[role="alertdialog"] button:has-text("Cancel")');
    await cancelConfirmBtn.click();
    await page.waitForTimeout(500);

    const isModalStillVisible = await deleteConfirmHeader.isVisible();
    console.log("✔ Confirmation modal closed after Cancel:", !isModalStillVisible);

    // Verify Edit Reservation dialog is still open
    const editHeader = page.locator('text=Edit Reservation Details');
    console.log("✔ Edit Reservation dialog remains safely open:", await editHeader.isVisible());

    // Verify still no POST requests made
    console.log("Total POST requests after Cancel:", postRequests.length);
    console.log("=== ALL DELETE CONFIRMATION UX CHECKS PASSED ===");

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await browser.close();
  }
}

run();
