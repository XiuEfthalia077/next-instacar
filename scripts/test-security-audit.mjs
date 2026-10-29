import {
  checkRateLimit,
  checkAccountLockout,
  recordFailedLogin,
  clearFailedLogins,
} from "../src/lib/rate-limit.ts";
import {
  sanitizeRichText,
  cleanSearchQuery,
  isSafeFileUpload,
} from "../src/lib/security.ts";

async function runSecurityAudit() {
  console.log("=============================================================");
  console.log("  ROUND 29: OWASP SECURITY & VULNERABILITY HARDENING AUDIT   ");
  console.log("=============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✘ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Account Lockout & Brute-force Mitigation
  console.log("1. Testing Brute-Force & Account Lockout Mechanism...");
  const testAccount = "victim_audit@example.com";
  clearFailedLogins(testAccount);

  let lockoutState = checkAccountLockout(testAccount);
  assert(!lockoutState.locked, "Initial state: account is not locked");

  for (let i = 1; i <= 4; i++) {
    const res = recordFailedLogin(testAccount);
    assert(!res.locked && res.remainingAttempts === 5 - i, `Failed attempt #${i}: not locked, ${res.remainingAttempts} attempts remaining`);
  }

  // 5th attempt triggers lockout
  const fifthAttempt = recordFailedLogin(testAccount);
  assert(fifthAttempt.locked && fifthAttempt.remainingAttempts === 0, "5th failed attempt: triggers account lockout");

  const lockedCheck = checkAccountLockout(testAccount);
  assert(lockedCheck.locked && lockedCheck.resetSeconds > 0, `Account is locked for ${lockedCheck.resetSeconds}s`);

  // Clear lockout upon correct login
  clearFailedLogins(testAccount);
  const clearedCheck = checkAccountLockout(testAccount);
  assert(!clearedCheck.locked, "Successful login clears lockout status");

  // 2. XSS & Rich-Text Input Sanitization
  console.log("\n2. Testing XSS & HTML Input Sanitization...");
  const maliciousPayloads = [
    { input: "<p>Hello <script>alert('xss')</script> World</p>", desc: "Inline script tag stripped" },
    { input: "<img src='car.png' onerror='alert(document.cookie)'>", desc: "Event handler (onerror) stripped" },
    { input: "<a href='javascript:alert(1)'>Click here</a>", desc: "javascript: URI scheme neutralized" },
    { input: "<iframe src='https://malicious.com'></iframe>", desc: "iframe embedding stripped" },
    { input: "<object data='exploit.swf'></object>", desc: "object tag stripped" },
    { input: "<div onmouseover='stealData()'>Hover me</div>", desc: "onmouseover event handler stripped" },
  ];

  for (const test of maliciousPayloads) {
    const sanitized = sanitizeRichText(test.input);
    const hasScript = sanitized.toLowerCase().includes("<script") ||
                      sanitized.toLowerCase().includes("onerror") ||
                      sanitized.toLowerCase().includes("javascript:") ||
                      sanitized.toLowerCase().includes("<iframe") ||
                      sanitized.toLowerCase().includes("<object") ||
                      sanitized.toLowerCase().includes("onmouseover");
    assert(!hasScript, `XSS sanitized: ${test.desc}`);
  }

  // PostgREST search injection
  const injectionSearch = "admin', status.eq.Active, (select password from users)--";
  const cleanedSearch = cleanSearchQuery(injectionSearch);
  assert(!cleanedSearch.includes("(") && !cleanedSearch.includes(",") && !cleanedSearch.includes("'"), "PostgREST syntax injection characters neutralized");

  // 3. File Upload MIME & Extension Security
  console.log("\n3. Testing Malicious File Upload Defenses...");
  const dangerousUploads = [
    { name: "backdoor.php", mime: "application/x-php", expected: false, desc: "PHP script blocked" },
    { name: "trojan.exe", mime: "application/x-msdownload", expected: false, desc: "Windows executable blocked" },
    { name: "shell.sh", mime: "application/x-sh", expected: false, desc: "Shell script blocked" },
    { name: "payload.php.jpg", mime: "image/jpeg", expected: false, desc: "Double extension bypass (payload.php.jpg) blocked" },
    { name: "exploit.svg", mime: "image/svg+xml", expected: false, desc: "SVG with potential XML/XSS blocked" },
    { name: "valid_id.jpg", mime: "image/jpeg", expected: true, desc: "Valid JPG photo permitted" },
    { name: "drivers_license.png", mime: "image/png", expected: true, desc: "Valid PNG image permitted" },
    { name: "billing_proof.pdf", mime: "application/pdf", expected: true, desc: "Valid PDF document permitted" },
  ];

  for (const f of dangerousUploads) {
    const isSafe = isSafeFileUpload(f.name, f.mime);
    assert(isSafe === f.expected, `File upload defense: ${f.desc}`);
  }

  console.log("\n=============================================================");
  console.log(`AUDIT SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("=============================================================");

  if (failed > 0) process.exit(1);
}

runSecurityAudit().catch(console.error);
