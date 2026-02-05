/**
 * Rate Limiting Utilities
 * Client-side rate limiting to prevent abuse
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private readonly defaultConfig: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  };

  /**
   * Check if request is allowed
   */
  isAllowed(key: string, config?: Partial<RateLimitConfig>): boolean {
    const limitConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();

    const record = this.requests.get(key);

    // If no record or window expired, reset
    if (!record || now > record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + limitConfig.windowMs,
      });
      return true;
    }

    // Check if limit exceeded
    if (record.count >= limitConfig.maxRequests) {
      return false;
    }

    // Increment count
    record.count++;
    this.requests.set(key, record);

    return true;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, config?: Partial<RateLimitConfig>): number {
    const limitConfig = { ...this.defaultConfig, ...config };
    const record = this.requests.get(key);

    if (!record) {
      return limitConfig.maxRequests;
    }

    const now = Date.now();
    if (now > record.resetTime) {
      return limitConfig.maxRequests;
    }

    return Math.max(0, limitConfig.maxRequests - record.count);
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limit decorator for functions
 */
export function withRateLimit(
  key: string,
  config?: Partial<RateLimitConfig>
): <T extends (...args: any[]) => any>(fn: T) => T {
  return function <T extends (...args: any[]) => any>(fn: T): T {
    return (async (...args: any[]) => {
      if (!rateLimiter.isAllowed(key, config)) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      return fn(...args);
    }) as T;
  };
}

/**
 * API-specific rate limiters
 */
export const apiRateLimiter = {
  auth: (key: string) => rateLimiter.isAllowed(`auth:${key}`, { maxRequests: 5, windowMs: 60000 }),
  api: (key: string) => rateLimiter.isAllowed(`api:${key}`, { maxRequests: 30, windowMs: 60000 }),
  chat: (key: string) => rateLimiter.isAllowed(`chat:${key}`, { maxRequests: 20, windowMs: 60000 }),
};

export default rateLimiter;
