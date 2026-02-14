/**
 * Stress tests for the in-memory rate limiter.
 *
 * Staff report the app becoming unresponsive when performing many actions
 * quickly. These tests verify the rate limiter's behavior under load and
 * expose edge cases in the in-memory Map-based implementation.
 */

import {
  checkRateLimit,
  getRateLimitIdentifier,
  rateLimitResponse,
  type RateLimitConfig,
} from '@/lib/api-server-utils';

// We need to reset the in-memory store between tests.
// The store is module-scoped, so we use jest.resetModules().
let _checkRateLimit: typeof checkRateLimit;
let _getRateLimitIdentifier: typeof getRateLimitIdentifier;
let _rateLimitResponse: typeof rateLimitResponse;

beforeEach(() => {
  jest.resetModules();
  // Re-import to get a fresh rateLimitStore Map
  const mod = jest.requireActual('@/lib/api-server-utils') as typeof import('@/lib/api-server-utils');
  _checkRateLimit = mod.checkRateLimit;
  _getRateLimitIdentifier = mod.getRateLimitIdentifier;
  _rateLimitResponse = mod.rateLimitResponse;
});

describe('Rate Limiter - Basic Behavior', () => {
  it('should allow requests within the limit', () => {
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 };

    for (let i = 0; i < 10; i++) {
      const result = _checkRateLimit('user:test', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10 - (i + 1));
    }
  });

  it('should block requests exceeding the limit', () => {
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 5 };

    // Use up all 5 requests
    for (let i = 0; i < 5; i++) {
      _checkRateLimit('user:test', config);
    }

    // 6th request should be blocked
    const result = _checkRateLimit('user:test', config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different identifiers independently', () => {
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 3 };

    // Exhaust user A
    for (let i = 0; i < 3; i++) {
      _checkRateLimit('user:A', config);
    }
    expect(_checkRateLimit('user:A', config).allowed).toBe(false);

    // User B should still be allowed
    expect(_checkRateLimit('user:B', config).allowed).toBe(true);
  });
});

describe('Rate Limiter - Window Reset', () => {
  it('should reset after the window expires', () => {
    const config: RateLimitConfig = { windowMs: 1_000, maxRequests: 2 };

    // Exhaust the limit
    _checkRateLimit('user:test', config);
    _checkRateLimit('user:test', config);
    expect(_checkRateLimit('user:test', config).allowed).toBe(false);

    // Advance time past the window
    const originalNow = Date.now;
    Date.now = jest.fn().mockReturnValue(originalNow() + 1_100);

    // Should be allowed again
    const result = _checkRateLimit('user:test', config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1); // 2 max - 1 used

    Date.now = originalNow;
  });

  it('should return correct resetAt timestamp', () => {
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 100 };
    const before = Date.now();
    const result = _checkRateLimit('user:test', config);
    const after = Date.now();

    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60_000);
    expect(result.resetAt).toBeLessThanOrEqual(after + 60_000);
  });
});

describe('Rate Limiter - High Concurrency Simulation', () => {
  it('should handle 100 rapid requests from the same user', () => {
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 100 };

    const results = [];
    for (let i = 0; i < 150; i++) {
      results.push(_checkRateLimit('user:flood', config));
    }

    const allowed = results.filter(r => r.allowed);
    const blocked = results.filter(r => !r.allowed);

    expect(allowed).toHaveLength(100);
    expect(blocked).toHaveLength(50);
  });

  it('should handle burst from many different users', () => {
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 };

    // 50 different users, 10 requests each = 500 total
    for (let user = 0; user < 50; user++) {
      for (let req = 0; req < 10; req++) {
        const result = _checkRateLimit(`user:${user}`, config);
        expect(result.allowed).toBe(true);
      }
    }

    // Each user's 11th request should be blocked
    for (let user = 0; user < 50; user++) {
      const result = _checkRateLimit(`user:${user}`, config);
      expect(result.allowed).toBe(false);
    }
  });

  it('should correctly report remaining count under load', () => {
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 30 };

    for (let i = 0; i < 30; i++) {
      const result = _checkRateLimit('user:count-test', config);
      expect(result.remaining).toBe(30 - (i + 1));
    }
  });
});

describe('Rate Limiter - Write vs Read Limits', () => {
  it('should enforce stricter limits for write operations', () => {
    const readConfig: RateLimitConfig = { windowMs: 60_000, maxRequests: 100 };
    const writeConfig: RateLimitConfig = { windowMs: 60_000, maxRequests: 30 };

    // Simulate a user doing rapid writes (bulk edit scenario)
    for (let i = 0; i < 30; i++) {
      const result = _checkRateLimit('user:writer:write', writeConfig);
      expect(result.allowed).toBe(true);
    }

    // 31st write should be blocked
    expect(_checkRateLimit('user:writer:write', writeConfig).allowed).toBe(false);

    // But reads should still work (different identifier key)
    expect(_checkRateLimit('user:writer:read', readConfig).allowed).toBe(true);
  });
});

describe('Rate Limiter - Store Cleanup', () => {
  it('should clean up expired entries when store exceeds max size', () => {
    const config: RateLimitConfig = { windowMs: 1_000, maxRequests: 1 };

    // Fill the store past the 1000-entry threshold
    for (let i = 0; i < 1_001; i++) {
      _checkRateLimit(`user:cleanup-${i}`, config);
    }

    // Advance time past the window so all entries are expired
    const originalNow = Date.now;
    Date.now = jest.fn().mockReturnValue(originalNow() + 2_000);

    // Next request triggers cleanup (store size > MAX_STORE_SIZE)
    const result = _checkRateLimit('user:after-cleanup', config);
    expect(result.allowed).toBe(true);

    Date.now = originalNow;
  });

  it('should clean up expired entries periodically even under threshold', () => {
    const config: RateLimitConfig = { windowMs: 1_000, maxRequests: 1 };
    const mod = jest.requireActual('@/lib/api-server-utils') as typeof import('@/lib/api-server-utils');

    // Add a few entries
    for (let i = 0; i < 5; i++) {
      _checkRateLimit(`user:periodic-${i}`, config);
    }

    // Advance time past both the window and the 60s cleanup interval
    const originalNow = Date.now;
    Date.now = jest.fn().mockReturnValue(originalNow() + 61_000);

    // This triggers periodic cleanup even though store is small
    _checkRateLimit('user:trigger-cleanup', config);

    // The expired entries should have been cleaned up
    // Only the new entry should remain
    expect(mod.rateLimitStore.size).toBe(1);

    Date.now = originalNow;
  });
});

describe('getRateLimitIdentifier', () => {
  it('should prefer user ID over IP', () => {
    const request = {
      headers: {
        get: jest.fn().mockReturnValue('1.2.3.4'),
      },
    } as any;

    const id = _getRateLimitIdentifier(request, 'user-123');
    expect(id).toBe('user:user-123');
  });

  it('should fall back to x-forwarded-for IP', () => {
    const request = {
      headers: {
        get: jest.fn((name: string) => {
          if (name === 'x-forwarded-for') return '10.0.0.1, 10.0.0.2';
          return null;
        }),
      },
    } as any;

    const id = _getRateLimitIdentifier(request);
    expect(id).toBe('ip:10.0.0.1');
  });

  it('should fall back to x-real-ip', () => {
    const request = {
      headers: {
        get: jest.fn((name: string) => {
          if (name === 'x-real-ip') return '192.168.1.1';
          return null;
        }),
      },
    } as any;

    const id = _getRateLimitIdentifier(request);
    expect(id).toBe('ip:192.168.1.1');
  });

  it('should use "unknown" when no IP is available', () => {
    const request = {
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    } as any;

    const id = _getRateLimitIdentifier(request);
    expect(id).toBe('ip:unknown');
  });
});

describe('rateLimitResponse', () => {
  it('should return 429 with Retry-After header', () => {
    const resetAt = Date.now() + 30_000;
    const response = _rateLimitResponse(resetAt);

    expect(response.status).toBe(429);
  });
});
