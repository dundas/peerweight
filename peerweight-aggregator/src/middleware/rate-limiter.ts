/**
 * Rate Limiter Middleware
 * Implements sliding window rate limiting with configurable limits
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string; // Function to generate rate limit key
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries periodically
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Default key generator uses IP address
 */
function defaultKeyGenerator(request: Request): string {
  // Try to get client IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default key (for local development)
  return 'default';
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  startCleanup();

  const key = (config.keyGenerator || defaultKeyGenerator)(request);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Create rate limit headers
 */
export function createRateLimitHeaders(
  remaining: number,
  resetAt: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };
}

/**
 * Create a 429 Too Many Requests response
 */
export function createTooManyRequestsResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

// Preset configurations
export const RateLimitPresets = {
  // General API: 100 requests per minute
  api: {
    windowMs: 60000,
    maxRequests: 100,
  },
  // Search endpoints: 30 requests per minute
  search: {
    windowMs: 60000,
    maxRequests: 30,
  },
  // Admin endpoints: 10 requests per minute
  admin: {
    windowMs: 60000,
    maxRequests: 10,
  },
  // Crawl trigger: 5 requests per minute
  crawl: {
    windowMs: 60000,
    maxRequests: 5,
  },
  // Very strict: 1 request per second (for testing)
  strict: {
    windowMs: 1000,
    maxRequests: 1,
  },
};

// Export for testing
export { rateLimitStore, stopCleanup };
