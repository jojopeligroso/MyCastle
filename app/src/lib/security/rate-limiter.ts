/**
 * Rate Limiting Utility
 *
 * In-memory rate limiter for development and small deployments.
 * For production with multiple servers, use Redis or a similar distributed store.
 *
 * Features:
 * - Sliding window rate limiting
 * - Automatic cleanup of expired entries
 * - Configurable limits per key
 * - Thread-safe operations
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(config: RateLimitConfig = {}) {
    this.windowMs = config.windowMs || 60 * 1000; // Default: 1 minute
    this.maxRequests = config.maxRequests || 5; // Default: 5 requests

    // Start cleanup interval to prevent memory leaks
    this.startCleanup();
  }

  /**
   * Check if a request is allowed under the rate limit
   * @param key - Unique identifier (e.g., IP address, user ID, email)
   * @returns Object with allowed status and optional retryAfter time
   */
  check(key: string): { allowed: boolean; retryAfter?: number; remaining?: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    // Clean up expired entry
    if (entry && entry.resetAt < now) {
      this.store.delete(key);
    }

    const currentEntry = this.store.get(key);

    // No entry exists, create one and allow
    if (!currentEntry) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    // Rate limit exceeded
    if (currentEntry.count >= this.maxRequests) {
      const retryAfter = Math.ceil((currentEntry.resetAt - now) / 1000);
      return { allowed: false, retryAfter, remaining: 0 };
    }

    // Increment count and allow
    currentEntry.count++;
    return { allowed: true, remaining: this.maxRequests - currentEntry.count };
  }

  /**
   * Reset rate limit for a specific key
   * @param key - The key to reset
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all rate limit entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 60 * 1000);
  }

  /**
   * Stop the cleanup interval (call when shutting down)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Default rate limiters for common use cases
export const ipRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute per IP
});

export const emailRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 requests per minute per email
});

export const strictRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per 15 minutes
});
