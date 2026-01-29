import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import {
  checkRateLimit,
  createRateLimitHeaders,
  createTooManyRequestsResponse,
  RateLimitPresets,
  rateLimitStore,
  stopCleanup,
} from './rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    // Clear the rate limit store before each test
    rateLimitStore.clear();
  });

  afterAll(() => {
    // Stop cleanup interval
    stopCleanup();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const request = new Request('http://localhost/', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const config = { windowMs: 60000, maxRequests: 3 };

      const result1 = checkRateLimit(request, config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimit(request, config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit(request, config);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests over limit', () => {
      const request = new Request('http://localhost/', {
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });

      const config = { windowMs: 60000, maxRequests: 2 };

      checkRateLimit(request, config);
      checkRateLimit(request, config);

      const result = checkRateLimit(request, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different IPs separately', () => {
      const request1 = new Request('http://localhost/', {
        headers: { 'x-forwarded-for': '192.168.1.3' },
      });
      const request2 = new Request('http://localhost/', {
        headers: { 'x-forwarded-for': '192.168.1.4' },
      });

      const config = { windowMs: 60000, maxRequests: 1 };

      const result1 = checkRateLimit(request1, config);
      expect(result1.allowed).toBe(true);

      const result2 = checkRateLimit(request2, config);
      expect(result2.allowed).toBe(true);

      // Both should now be blocked
      const result1b = checkRateLimit(request1, config);
      expect(result1b.allowed).toBe(false);

      const result2b = checkRateLimit(request2, config);
      expect(result2b.allowed).toBe(false);
    });

    it('should support custom key generator', () => {
      const request = new Request('http://localhost/', {
        headers: { 'x-api-key': 'test-key-123' },
      });

      const config = {
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (req: Request) => req.headers.get('x-api-key') || 'default',
      };

      const result1 = checkRateLimit(request, config);
      expect(result1.allowed).toBe(true);

      const result2 = checkRateLimit(request, config);
      expect(result2.allowed).toBe(false);
    });

    it('should return reset time in the future', () => {
      const request = new Request('http://localhost/', {
        headers: { 'x-forwarded-for': '192.168.1.5' },
      });

      const config = { windowMs: 60000, maxRequests: 1 };
      const result = checkRateLimit(request, config);

      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe('createRateLimitHeaders', () => {
    it('should create proper headers', () => {
      const headers = createRateLimitHeaders(5, Date.now() + 60000, 10);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });
  });

  describe('createTooManyRequestsResponse', () => {
    it('should create 429 response', async () => {
      const resetAt = Date.now() + 30000;
      const response = createTooManyRequestsResponse(resetAt);

      expect(response.status).toBe(429);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Retry-After')).toBeDefined();

      const body = await response.json();
      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('RateLimitPresets', () => {
    it('should have expected presets', () => {
      expect(RateLimitPresets.api).toBeDefined();
      expect(RateLimitPresets.search).toBeDefined();
      expect(RateLimitPresets.admin).toBeDefined();
      expect(RateLimitPresets.crawl).toBeDefined();
      expect(RateLimitPresets.strict).toBeDefined();
    });

    it('should have valid configurations', () => {
      for (const preset of Object.values(RateLimitPresets)) {
        expect(preset.windowMs).toBeGreaterThan(0);
        expect(preset.maxRequests).toBeGreaterThan(0);
      }
    });
  });
});
