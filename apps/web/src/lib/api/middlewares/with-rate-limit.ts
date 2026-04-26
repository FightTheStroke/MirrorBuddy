import {
  checkRateLimitAsync,
  getRateLimitIdentifier,
  rateLimitResponse,
} from "@/lib/rate-limit";
import type { RateLimitConfig } from "@/lib/rate-limit-types";
import type { Middleware } from "./types";

/**
 * Rate limiting middleware factory
 *
 * Creates a middleware that enforces rate limits using Redis (production)
 * or in-memory store (development).
 *
 * Prefers userId for authenticated requests, falls back to IP address.
 *
 * @param config - Rate limit configuration (maxRequests, windowMs)
 * @returns Middleware that enforces the rate limit
 *
 * @example
 * ```ts
 * import { pipe, withAuth, withRateLimit } from '@/lib/api/middlewares';
 * import { RATE_LIMITS } from '@/lib/rate-limit';
 *
 * export const POST = pipe(
 *   withAuth,
 *   withRateLimit(RATE_LIMITS.CHAT),
 *   async (ctx) => {
 *     // Rate limited to 60 req/min
 *     return Response.json({ success: true });
 *   }
 * );
 * ```
 */
export function withRateLimit(config: RateLimitConfig): Middleware {
  return async (ctx, next) => {
    // Get identifier from context (userId if authenticated) or request IP
    const identifier = getRateLimitIdentifier(ctx.req, ctx.userId);

    // Check rate limit asynchronously
    const result = await checkRateLimitAsync(identifier, config);

    if (!result.success) {
      return rateLimitResponse(result);
    }

    // Rate limit passed, proceed
    return next();
  };
}
