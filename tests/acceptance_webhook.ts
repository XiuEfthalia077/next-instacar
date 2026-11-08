import {
  decidePriceWording,
  sanitizePriceWording,
  formatForMessenger,
  POST,
  FIRST_OFFER_DISCOUNT_BY_TYPE,
} from "../src/app/api/webhook/route";
import { NextRequest } from "next/server";
import { getAdminClient } from "../src/lib/supabase-admin";

async function runDirectTest(psid: string, text: string) {
  const req = new NextRequest("http://localhost:3000/api/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderPsid: psid, text }),
  });
  const res = await POST(req);
  return await res.json();
}

async function main() {
  console.log("=== STARTING INSTACAR WEBHOOK ACCEPTANCE TESTS ===\n");
  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, extra?: any) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`, extra || "");
      failed++;
    }
  }

  // --- TEST 1: Price Decision Engine (Unit Tests) ---
  console.log("--> Testing Price Decision Engine & Sanitization:");
  const sameResult = decidePriceWording(2000, 2000, 2);
  assert("Same price comparison is SAME", sameResult.comparison === "SAME");
  assert("Same price disallows discount words", sameResult.allowDiscountWords === false);
  assert("Same price includes 'remains' and math", sameResult.priceText.includes("remains ₱2,000") && sameResult.priceText.includes("2 days x ₱2,000 = ₱4,000"));

  const lowerResult = decidePriceWording(2000, 1500, 2);
  assert("Lower price comparison is LOWER", lowerResult.comparison === "LOWER");
  assert("Lower price allows discount words", lowerResult.allowDiscountWords === true);
  assert("Lower price includes 'Good news' and math", lowerResult.priceText.includes("Good news!") && lowerResult.priceText.includes("instead of ₱2,000"));

  const blockedText = sanitizePriceWording("Special promo: discounted rate of ₱2000 since you'll rent for multiple days, discounted rate", false);
  assert("Sanitizer strips promo/discount words when disallowed", !blockedText.toLowerCase().includes("promo") && !blockedText.toLowerCase().includes("discounted") && !blockedText.includes("discounted rate"));

  // --- TEST 2: Messenger Formatting ---
  console.log("\n--> Testing Messenger Formatting:");
  const rawWithMarkdown = "**Hello Sir John!**\n\n### Car Fleet\n\nRate: ₱1,500";
  const formatted = formatForMessenger(rawWithMarkdown);
  assert("Formatting strips bold asterisks", !formatted.includes("**"));
  assert("Formatting strips markdown headers", !formatted.includes("###"));
  assert("Formatting replaces empty newlines with space line", formatted.includes("\n \n"));

  // --- TEST 3: Flow Acceptance Tests with Direct Payload ---
  console.log("\n--> Testing Messenger Conversational Flow:");
  const testPsid = `test_runner_${Date.now()}`;

  // Reset any prior session
  await runDirectTest(testPsid, "reset");

  // Acceptance 1: "how much is the Honda City for 1 day"
  const t1 = await runDirectTest(testPsid, "how much is the Honda City for 1 day");
  assert("T1 returns SUCCESS", t1.status === "SUCCESS");
  assert("T1 quotes 24h price with math and no discount words", t1.result?.action === "QUOTED_PRICE" && !t1.result?.priceDecision?.allowDiscountWords);

  // Acceptance 2: "how about 2 days"
  const t2 = await runDirectTest(testPsid, "how about 2 days");
  assert("T2 returns SAME rate decision", t2.result?.action === "QUOTED_PRICE" && t2.result?.priceDecision?.comparison === "SAME");

  // Acceptance 4 & 5: Picture triggers
  const t4 = await runDirectTest(testPsid, "send picture of Honda City");
  assert("T4 triggers photo handler", t4.result?.action === "SENT_NAMED_CAR_IMAGE" || t4.result?.action === "NO_IMAGE_FOR_CAR");

  const t5 = await runDirectTest(testPsid, "pics of available cars");
  assert("T5 triggers fleet photos", t5.result?.action === "SENT_FLEET_IMAGES" || t5.result?.action === "NO_IMAGES_AVAILABLE");

  // Acceptance 8: Missing mobile number
  const t8 = await runDirectTest(testPsid, "John Smith, Honda City, Nov 25 8am to Nov 27 8am, pickup, self-drive");
  assert("T8 detects missing phone number", t8.result?.action === "REQUESTED_MISSING_FIELDS" && t8.result?.missingFields?.some((f: string) => f.includes("Mobile Number")));

  // Acceptance 9: Full details -> Summary -> YES -> Booking Insert
  const t9 = await runDirectTest(testPsid, "John Smith, 09171234567, Honda City, Nov 25 8am to Nov 27 8am, pickup, self-drive");
  assert("T9 presents Step 2 summary", t9.result?.action === "AWAITING_CONFIRMATION" && t9.result?.totalPrice > 0);

  const t9_yes = await runDirectTest(testPsid, "YES");
  assert("T9 YES creates booking in DB and requests documents", t9_yes.result?.action === "BOOKING_INSERTED" && t9_yes.result?.bookingId > 0);

  // Cleanup test booking & session from database
  const supabase = getAdminClient();
  if (supabase && t9_yes.result?.bookingId) {
    await supabase.from("booking_payments").delete().eq("booking_id", t9_yes.result.bookingId);
    await supabase.from("bookings").delete().eq("id", t9_yes.result.bookingId);
    await supabase.from("contact_messages").delete().eq("name", `fb_session_${testPsid}`);
  }

  console.log(`\n=== ACCEPTANCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
}

main().catch(console.error);
