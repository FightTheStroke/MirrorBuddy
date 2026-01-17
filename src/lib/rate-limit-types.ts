/**
 * Rate Limit Types
 * Shared types for rate limiting modules to avoid circular dependencies.
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when the limit resets */
  resetTime: number;
  /** Total limit for the window */
  limit: number;
}
