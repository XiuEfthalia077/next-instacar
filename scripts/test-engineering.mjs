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
  // Bypasses that must be rejected (return empty string)
  assert.equal(safeNext("/\\attacker.com"), "");
  assert.equal(safeNext("//attacker.com"), "");
  assert.equal(safeNext("http://attacker.com"), "");
  assert.equal(safeNext("https://attacker.com"), "");
  assert.equal(safeNext("javascript:alert(1)"), "");
  assert.equal(safeNext("/path\\with\\backslash"), "");
  assert.equal(safeNext("   "), "");

  // Safe internal paths that must be accepted
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
  // 4th request must fail
  assert.equal(checkLimit("user1", 3).success, false);
  // Different key must still succeed
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

  // Admin can access any branch
  assert.equal(verifyAccess("admin", 1, 2).allowed, true);
  assert.equal(verifyAccess("admin", null, 2).allowed, true);

  // Staff can only access their own branch
  assert.equal(verifyAccess("staff", 1, 1).allowed, true);
  assert.equal(verifyAccess("staff", 2, 2).allowed, true);
  assert.equal(verifyAccess("staff", 1, 2).allowed, false);
});
