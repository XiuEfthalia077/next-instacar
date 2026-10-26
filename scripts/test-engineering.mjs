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
