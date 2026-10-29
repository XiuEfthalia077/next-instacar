/**
 * In-memory sliding-window rate limiter & Account Lockout Tracker.
 * Protects unauthenticated public endpoints and authentication actions
 * against brute-force attacks, credential stuffing, and volumetric floods.
 */

interface RateLimitConfig {
  interval: number; // in milliseconds
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // seconds until oldest request expires
}

// Global cache map per Node process for sliding window
const globalCache = new Map<string, number[]>();

// Account lockout tracker: email -> { attempts: number[], lockedUntil: number }
interface LockoutEntry {
  failures: number[];
  lockedUntil: number;
}
const lockoutCache = new Map<string, LockoutEntry>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // Track failures within 15 mins

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { interval: 60_000, maxRequests: 10 },
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.interval;

  const current = globalCache.get(key) ?? [];
  const validTimestamps = current.filter((timestamp) => timestamp > windowStart);

  if (validTimestamps.length >= config.maxRequests) {
    const oldest = validTimestamps[0];
    const reset = Math.max(1, Math.ceil((oldest + config.interval - now) / 1000));
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset,
    };
  }

  validTimestamps.push(now);
  globalCache.set(key, validTimestamps);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - validTimestamps.length,
    reset: Math.ceil(config.interval / 1000),
  };
}

/**
 * Checks if an account is currently locked out due to excessive failed attempts.
 */
export function checkAccountLockout(identifier: string): {
  locked: boolean;
  resetSeconds: number;
} {
  const key = identifier.trim().toLowerCase();
  const entry = lockoutCache.get(key);
  if (!entry) return { locked: false, resetSeconds: 0 };

  const now = Date.now();
  if (entry.lockedUntil > now) {
    const resetSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { locked: true, resetSeconds };
  }

  return { locked: false, resetSeconds: 0 };
}

/**
 * Records a failed authentication attempt. Locks out the account if >= 5 failures occur.
 */
export function recordFailedLogin(identifier: string): {
  locked: boolean;
  remainingAttempts: number;
  resetSeconds: number;
} {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  const windowStart = now - FAILURE_WINDOW_MS;

  const entry = lockoutCache.get(key) ?? { failures: [], lockedUntil: 0 };
  const validFailures = entry.failures.filter((t) => t > windowStart);
  validFailures.push(now);

  if (validFailures.length >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    lockoutCache.set(key, { failures: validFailures, lockedUntil });
    return {
      locked: true,
      remainingAttempts: 0,
      resetSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  lockoutCache.set(key, { failures: validFailures, lockedUntil: 0 });
  return {
    locked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - validFailures.length,
    resetSeconds: 0,
  };
}

/**
 * Clears failed login counter upon successful authentication.
 */
export function clearFailedLogins(identifier: string): void {
  const key = identifier.trim().toLowerCase();
  lockoutCache.delete(key);
}
