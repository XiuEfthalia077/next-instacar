/**
 * In-memory sliding-window rate limiter.
 * Protects unauthenticated public endpoints and authentication actions
 * against brute-force attacks and volumetric request floods.
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

// Global cache map per Node process
const globalCache = new Map<string, number[]>();

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
