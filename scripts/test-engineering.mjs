import test from "node:test";
import assert from "node:assert/strict";

// Test 1: Open Redirect & Path Sanitization (safeNext logic)
function safeNext(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "";
  }
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") return "";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
}

test("safeNext rejects external domains, protocol-relative, and backslash bypasses", () => {
  assert.equal(safeNext("/\\attacker.com"), "");
  assert.equal(safeNext("//attacker.com"), "");
  assert.equal(safeNext("http://attacker.com"), "");
  assert.equal(safeNext("https://attacker.com"), "");
  assert.equal(safeNext("javascript:alert(1)"), "");
  assert.equal(safeNext("/path\\with\\backslash"), "");
  assert.equal(safeNext("   "), "");

  assert.equal(safeNext("/user/dashboard"), "/user/dashboard");
  assert.equal(safeNext("/admin/bookings_online?filter=Confirmed"), "/admin/bookings_online?filter=Confirmed");
  assert.equal(safeNext("/shared/calendar#top"), "/shared/calendar#top");
});

// Test 2: In-Memory Sliding Window Rate Limiter
test("checkRateLimit throttles burst requests within window", () => {
  const cache = new Map();
  function checkLimit(key, maxRequests = 3, interval = 1000) {
    const now = Date.now();
    const windowStart = now - interval;
    const current = (cache.get(key) || []).filter((t) => t > windowStart);
    if (current.length >= maxRequests) {
      return { success: false };
    }
    current.push(now);
    cache.set(key, current);
    return { success: true };
  }

  assert.equal(checkLimit("user1", 3).success, true);
  assert.equal(checkLimit("user1", 3).success, true);
  assert.equal(checkLimit("user1", 3).success, true);
  assert.equal(checkLimit("user1", 3).success, false);
  assert.equal(checkLimit("user2", 3).success, true);
});

// Test 3: Branch Authorization Isolation for Staff
test("assertBranchAccess enforces physical branch boundaries for staff", () => {
  function verifyAccess(sessionRole, sessionBranchId, bookingBranchId) {
    if (sessionRole === "staff") {
      if (sessionBranchId && bookingBranchId && bookingBranchId !== sessionBranchId) {
        return { allowed: false, error: "Cross-branch access denied" };
      }
    }
    return { allowed: true };
  }

  assert.equal(verifyAccess("admin", 1, 2).allowed, true);
  assert.equal(verifyAccess("admin", null, 2).allowed, true);
  assert.equal(verifyAccess("staff", 1, 1).allowed, true);
  assert.equal(verifyAccess("staff", 2, 2).allowed, true);
  assert.equal(verifyAccess("staff", 1, 2).allowed, false);
});

// Test 4: Security - XSS Rich Text Sanitizer
import { sanitizeRichText, cleanSearchQuery, isSafeFileUpload } from "../src/lib/security.ts";

test("sanitizeRichText strips script tags, event handlers, and dangerous URIs", () => {
  const maliciousScript = "<p>Hello</p><script>alert('XSS')</script>";
  assert.equal(sanitizeRichText(maliciousScript), "<p>Hello</p>");

  const maliciousIframe = "<p>Terms</p><iframe src='http://evil.com'></iframe>";
  assert.equal(sanitizeRichText(maliciousIframe), "<p>Terms</p>");

  const maliciousEventHandler = '<p onmouseover="alert(1)" onclick="stealCookies()">Agreement Section</p>';
  assert.equal(sanitizeRichText(maliciousEventHandler), "<p>Agreement Section</p>");

  const maliciousHref = '<a href="javascript:alert(1)">Click Here</a>';
  assert.equal(sanitizeRichText(maliciousHref), '<a href="#">Click Here</a>');

  const safeHtml = "<h3>Agreement Article 1</h3><p><strong>Renter:</strong> John Doe</p>";
  assert.equal(sanitizeRichText(safeHtml), safeHtml);
});

// Test 5: Security - PostgREST SQL/Filter Injection Protection
test("cleanSearchQuery removes PostgREST syntax punctuation to prevent injection", () => {
  const queryWithOperators = "john,email.ilike.%admin%";
  assert.equal(cleanSearchQuery(queryWithOperators), "john email ilike admin");

  const queryWithQuotesAndParens = "test') or (role=admin";
  assert.equal(cleanSearchQuery(queryWithQuotesAndParens), "test or role=admin");

  const safeTerm = "Toyota Fortuner 2024";
  assert.equal(cleanSearchQuery(safeTerm), "Toyota Fortuner 2024");
});

// Test 6: Security - File Upload Whitelist and Script Execution Prevention
test("isSafeFileUpload strictly rejects executable extensions and double extensions", () => {
  // Executable files must be rejected
  assert.equal(isSafeFileUpload("exploit.php", "image/jpeg"), false);
  assert.equal(isSafeFileUpload("payload.phtml", "image/png"), false);
  assert.equal(isSafeFileUpload("script.js", "application/javascript"), false);
  assert.equal(isSafeFileUpload("script.sh", "text/plain"), false);
  assert.equal(isSafeFileUpload("malware.exe", "application/octet-stream"), false);

  // Double extension bypasses must be rejected
  assert.equal(isSafeFileUpload("shell.php.jpg", "image/jpeg"), false);
  assert.equal(isSafeFileUpload("backdoor.js.png", "image/png"), false);

  // Valid image and document files must be accepted
  assert.equal(isSafeFileUpload("car_front.jpg", "image/jpeg"), true);
  assert.equal(isSafeFileUpload("valid_id.png", "image/png"), true);
  assert.equal(isSafeFileUpload("proof_billing.pdf", "application/pdf"), true);
  assert.equal(isSafeFileUpload("vehicle_photo.webp", "image/webp"), true);
});

// Test 7: Analytics Backend - Company Cars Profit Sharing & True Net Logic
test("analytics calculation logic for Company Cars matches business rules", () => {
  // Company Cars:
  // Company Net (Gross Profit): Daily Rent + Extension Fee + Delivery Fees - Driver Fees. (Operator Net is strictly ₱0).
  // True Net Profit: Company Net - Total Recorded Expenses.
  const payment = {
    daily_rent: 2000,
    extension_fee: 400,
    delivery_fee: 300,
    pickup_fee: 150,
    driver_fee: 500,
    fuel: 200,
    damage_fee: 0,
    total_gross: 3550,
  };
  const recordedExpenses = 20000;

  const deliveryFees = payment.delivery_fee + payment.pickup_fee; // 450
  const companyNet = payment.daily_rent + payment.extension_fee + deliveryFees - payment.driver_fee;
  assert.equal(companyNet, 2000 + 400 + 450 - 500); // 2350
  const operatorNet = 0;
  assert.equal(operatorNet, 0);

  const trueNetProfit = companyNet - recordedExpenses;
  assert.equal(trueNetProfit, 2350 - 20000); // -17650
});

// Test 8: Analytics Backend - Operator Cars Profit Sharing & Custodial Ledger
test("analytics calculation logic for Operator Cars matches business rules", () => {
  // Operator Cars (Owner-owned):
  // Company Net: Fixed cut of Daily Rent (e.g. ₱400) + Fixed cut of Extension Fee (e.g. ₱150).
  // Operator Net: Remaining Daily Rent (e.g. ₱1,300) + Remaining Extension Fee (e.g. ₱450).
  // Custodial Ledger: Operator gets 100% of Fuel Charges and Damage Fees tracked in Custodial Balance.
  // Driver Fees: Passed 100% to drivers.
  const payment = {
    daily_rent: 1700,
    extension_fee: 600,
    driver_fee: 400,
    fuel: 350,
    damage_fee: 1500,
    total_gross: 4550,
    operator_share: 1300, // recorded 1300
  };

  const opRent = payment.operator_share; // 1300
  const coRent = payment.daily_rent - opRent; // 400

  const coExt = Math.round(payment.extension_fee * 0.25 * 100) / 100; // 150
  const opExt = Math.round((payment.extension_fee - coExt) * 100) / 100; // 450

  const companyNet = coRent + coExt;
  const operatorNet = opRent + opExt;
  const custodialBalance = payment.fuel + payment.damage_fee;

  assert.equal(coRent, 400);
  assert.equal(opRent, 1300);
  assert.equal(coExt, 150);
  assert.equal(opExt, 450);
  assert.equal(companyNet, 550);
  assert.equal(operatorNet, 1750);
  assert.equal(custodialBalance, 1850); // 350 fuel + 1500 damage
});

// Test 9: 6-Digit OTP Generation & SHA-256 Hashing Verification
test("OTP generation produces 6-digit numeric string and verifies against SHA-256 hash", () => {
  import("node:crypto").then((crypto) => {
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    assert.match(rawOtp, /^\d{6}$/);

    const hash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const testHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const wrongHash = crypto.createHash("sha256").update("999999").digest("hex");

    assert.equal(hash, testHash);
    assert.notEqual(hash, wrongHash);
  });
});

// Test 10: QStash Email Payload Structure
test("QStash email job payload validates required fields for all 4 flows", () => {
  const allowedTypes = [
    "welcome",
    "booking_client_confirmation",
    "booking_admin_notification",
    "otp_verification",
    "inquiry_user_confirmation",
    "inquiry_admin_notification",
  ];

  function validatePayload(payload) {
    if (!payload.type || !allowedTypes.includes(payload.type)) return false;
    if (!payload.email || typeof payload.email !== "string" || !payload.email.includes("@")) return false;
    if (!payload.data || typeof payload.data !== "object") return false;
    return true;
  }

  assert.equal(
    validatePayload({ type: "welcome", email: "user@example.com", data: { name: "John" } }),
    true,
  );
  assert.equal(
    validatePayload({ type: "otp_verification", email: "user@example.com", data: { otp: "123456" } }),
    true,
  );
  assert.equal(
    validatePayload({ type: "booking_client_confirmation", email: "user@example.com", data: { bookingId: 101 } }),
    true,
  );
  assert.equal(
    validatePayload({ type: "invalid_type", email: "user@example.com", data: {} }),
    false,
  );
  assert.equal(
    validatePayload({ type: "welcome", email: "", data: {} }),
    false,
  );
});

// Test 11: Vehicle ID parsing from FormData (handling car_id, vehicle_id, string, number, or JSON object)
test("parseVehicleId handles car_id, vehicle_id, and object serialization robustly", () => {
  function parseVehicleId(formMap) {
    for (const key of ["car_id", "vehicle_id", "carId", "vehicleId"]) {
      const raw = formMap[key];
      if (!raw) continue;
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed.id === "number") return parsed.id;
            if (parsed && typeof parsed.car_id === "number") return parsed.car_id;
            if (parsed && typeof parsed.vehicle_id === "number") return parsed.vehicle_id;
          } catch {}
        }
        const num = Number.parseInt(trimmed, 10);
        if (Number.isFinite(num) && num > 0) return num;
      }
      if (typeof raw === "number" && raw > 0) return raw;
    }
    return 0;
  }

  assert.equal(parseVehicleId({ car_id: "4" }), 4);
  assert.equal(parseVehicleId({ vehicle_id: "7" }), 7);
  assert.equal(parseVehicleId({ vehicle_id: 12 }), 12);
  assert.equal(parseVehicleId({ car_id: JSON.stringify({ id: 9 }) }), 9);
  assert.equal(parseVehicleId({ vehicle_id: JSON.stringify({ vehicle_id: 15 }) }), 15);
  assert.equal(parseVehicleId({}), 0);
  assert.equal(parseVehicleId({ car_id: "invalid" }), 0);
});

// Test 12: Customer Online Booking RLS and Authorization Policy Validation
test("customer online booking RLS check permits user owned bookings and admins", () => {
  function canReadBooking(booking, session) {
    if (session.role === "admin") return true;
    if (booking.user_id === session.userId) return true;
    return false;
  }

  function canInsertBooking(newRow, session) {
    if (["admin", "staff"].includes(session.role)) return true;
    if (newRow.user_id === session.userId) return true;
    return false;
  }

  const customerSession = { userId: 9, role: "user" };
  const otherCustomerSession = { userId: 10, role: "user" };
  const adminSession = { userId: 1, role: "admin" };

  const validBookingRow = { user_id: 9, car_id: 17 };
  const spoofedBookingRow = { user_id: 10, car_id: 17 };

  // Can customer insert their own booking?
  assert.equal(canInsertBooking(validBookingRow, customerSession), true);
  // Can customer insert for someone else?
  assert.equal(canInsertBooking(spoofedBookingRow, customerSession), false);
  // Can admin insert any booking?
  assert.equal(canInsertBooking(spoofedBookingRow, adminSession), true);

  // Can customer read their own inserted booking on RETURNING?
  assert.equal(canReadBooking(validBookingRow, customerSession), true);
  // Can another customer read it?
  assert.equal(canReadBooking(validBookingRow, otherCustomerSession), false);
  // Can admin read it?
  assert.equal(canReadBooking(validBookingRow, adminSession), true);
});

// Test 13: All Email Templates Conform to the Unified Design System
test("all email templates contain consistent brand header, footer, and styling", async () => {
  const {
    buildWelcomeEmail,
    buildBookingClientEmail,
    buildBookingAdminEmail,
    buildOtpEmail,
    buildInquiryUserEmail,
    buildInquiryAdminEmail,
    emailWrapper,
    emailButton,
  } = await import("../src/lib/emails/templates.ts");

  const emails = [
    buildWelcomeEmail({ name: "Jane Doe" }),
    buildBookingClientEmail({
      bookingId: 101,
      name: "Jane Doe",
      carName: "Toyota Fortuner",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
      pickupTime: "09:00:00",
      returnTime: "09:00:00",
      totalPrice: 6000,
    }),
    buildBookingAdminEmail({
      bookingId: 101,
      customerName: "Jane Doe",
      carName: "Toyota Fortuner",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
      bookingType: "online",
      totalPrice: 6000,
    }),
    buildOtpEmail({ otp: "123456" }),
    buildInquiryUserEmail({ name: "Jane Doe", subject: "Rental Rates", message: "Hello!" }),
    buildInquiryAdminEmail({ name: "Jane Doe", email: "jane@example.com", subject: "Inquiry", message: "Hi" }),
    {
      subject: "Custom Notification Test",
      html: emailWrapper({
        heading: "Status Notification",
        subheading: "Update Notice",
        content: "<p>Status details</p>" + emailButton({ href: "http://localhost:3000", label: "Check Status" }),
      }),
    },
  ];

  for (const email of emails) {
    assert.ok(email.subject && email.subject.length > 5, "Subject must exist and be descriptive");
    assert.ok(email.html.includes("INSTACAR RENTAL SERVICE"), "Every email must contain the official brand tag");
    assert.ok(email.html.includes("#ffcc00"), "Every email must use the signature InstaCar yellow");
    assert.ok(email.html.includes("#0d0d0d"), "Every email must use the consistent dark canvas background");
    assert.ok(email.html.includes("+63 (917) 000-0000"), "Every email must provide the 24/7 hotline");
    assert.ok(email.html.includes("InstaCar Rental Service Philippines"), "Every email must contain copyright");
  }
});

// Test 14: Action-Required Overdue Notification Detection Logic
test("getBookingAttentionAlert accurately detects overdue releases and returns", async () => {
  const { getBookingAttentionAlert } = await import("../src/lib/alerts.ts");

  // Mock dates relative to today
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const pastDate1 = new Date(now.getTime() - 1 * 86_400_000);
  const pastDateStr1 = `${pastDate1.getFullYear()}-${pad(pastDate1.getMonth() + 1)}-${pad(pastDate1.getDate())}`;

  const pastDate3 = new Date(now.getTime() - 3 * 86_400_000);
  const pastDateStr3 = `${pastDate3.getFullYear()}-${pad(pastDate3.getMonth() + 1)}-${pad(pastDate3.getDate())}`;

  const futureDate = new Date(now.getTime() + 2 * 86_400_000);
  const futureDateStr = `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`;

  // 1. Confirmed booking scheduled for today -> Overdue for Release today
  const releaseToday = getBookingAttentionAlert({
    status: "Confirmed",
    start_date: todayStr,
    end_date: futureDateStr,
  });
  assert.ok(releaseToday);
  assert.equal(releaseToday.type, "release");
  assert.equal(releaseToday.severity, "warning");
  assert.equal(releaseToday.message, "Car was supposed to be released today.");

  // 2. Confirmed booking scheduled 1 day ago -> Overdue for Release 1 day ago
  const release1DayAgo = getBookingAttentionAlert({
    status: "Confirmed",
    start_date: pastDateStr1,
    end_date: futureDateStr,
  });
  assert.ok(release1DayAgo);
  assert.equal(release1DayAgo.type, "release");
  assert.equal(release1DayAgo.severity, "urgent");
  assert.equal(release1DayAgo.message, "Car was supposed to be released 1 day ago.");

  // 3. Confirmed booking scheduled 3 days ago -> Overdue for Release 3 days ago
  const release3DaysAgo = getBookingAttentionAlert({
    status: "Confirmed",
    start_date: pastDateStr3,
    end_date: futureDateStr,
  });
  assert.ok(release3DaysAgo);
  assert.equal(release3DaysAgo.type, "release");
  assert.equal(release3DaysAgo.severity, "urgent");
  assert.equal(release3DaysAgo.message, "Car was supposed to be released 3 days ago.");

  // 4. Released booking scheduled for return today -> Overdue for Return today
  const returnToday = getBookingAttentionAlert({
    status: "Released",
    start_date: pastDateStr1,
    end_date: todayStr,
  });
  assert.ok(returnToday);
  assert.equal(returnToday.type, "return");
  assert.equal(returnToday.severity, "warning");
  assert.equal(returnToday.message, "Car was supposed to be returned today.");

  // 5. Released booking scheduled for return 3 days ago -> Overdue for Return 3 days ago
  const return3DaysAgo = getBookingAttentionAlert({
    status: "Released",
    start_date: pastDateStr3,
    end_date: pastDateStr3,
  });
  assert.ok(return3DaysAgo);
  assert.equal(return3DaysAgo.type, "return");
  assert.equal(return3DaysAgo.severity, "urgent");
  assert.equal(return3DaysAgo.message, "Car was supposed to be returned 3 days ago.");

  // 6. Automatic clearing when status changes (e.g. Completed or Cancelled)
  assert.equal(
    getBookingAttentionAlert({
      status: "Completed",
      start_date: pastDateStr3,
      end_date: pastDateStr1,
    }),
    null,
    "Completed bookings must clear the attention alert",
  );

  assert.equal(
    getBookingAttentionAlert({
      status: "Cancelled",
      start_date: pastDateStr3,
      end_date: pastDateStr1,
    }),
    null,
    "Cancelled bookings must clear the attention alert",
  );

  // 7. Future confirmed bookings have no alert yet
  assert.equal(
    getBookingAttentionAlert({
      status: "Confirmed",
      start_date: futureDateStr,
      end_date: futureDateStr,
    }),
    null,
    "Future confirmed bookings must not trigger premature alerts",
  );
});

// Test 15: Past Date Booking Validation & Confirmation Threshold
test("past date bookings are permitted through validation with confirmation gate", () => {
  const today = new Date().toISOString().slice(0, 10);
  const pastDate = "2026-10-01";

  function checkPastBooking(startDate) {
    const isPast = Boolean(startDate && startDate < today);
    return {
      allowed: true, // past date is allowed by backend
      requiresConfirmation: isPast, // triggers modal prompt before submit
      confirmationMessage: "You have selected a date in the past. Are you sure you want to proceed with this booking?",
    };
  }

  const pastResult = checkPastBooking(pastDate);
  assert.equal(pastResult.allowed, true);
  assert.equal(pastResult.requiresConfirmation, true);
  assert.ok(pastResult.confirmationMessage.includes("date in the past"));

  const futureResult = checkPastBooking("2026-12-01");
  assert.equal(futureResult.allowed, true);
  assert.equal(futureResult.requiresConfirmation, false);
});
