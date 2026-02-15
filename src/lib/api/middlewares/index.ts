/**
 * API Middlewares
 *
 * Composable middleware functions for API routes.
 * Each middleware follows the pattern: (ctx, next) => Promise<Response>
 *
 * @example
 * ```ts
 * import { pipe, withAuth, withCSRF, withRateLimit } from '@/lib/api/middlewares';
 * import { RATE_LIMITS } from '@/lib/rate-limit';
 *
 * export const POST = pipe(
 *   withCSRF,
 *   withAuth,
 *   withRateLimit(RATE_LIMITS.CHAT),
 *   async (ctx) => {
 *     // All middleware checks passed
 *     return Response.json({ userId: ctx.userId });
 *   }
 * );
 * ```
 */

// Re-export pipe function and types from pipe.ts (canonical source)
export { pipe, ApiError, errors } from '../pipe';
export type { Middleware, MiddlewareContext } from '../pipe';

// Re-export middleware
export { withCSRF } from './with-csrf';
export { withAuth } from './with-auth';
export { withAdmin } from './with-admin';
export { withRateLimit } from './with-rate-limit';
export { withSentry } from './with-sentry';
export { withCron } from './with-cron';

// Re-export streaming-safe auth helpers
export {
  validateAuthForStreaming,
  requireAuthForStreaming,
  validateSessionOwnershipForStreaming,
} from './validate-auth-streaming';
export type { StreamingAuthResult } from './validate-auth-streaming';

// Re-export resource ownership middleware
export { withResourceOwnership, verifyResourceOwnership } from './with-resource-ownership';
export type { ResourceOwnershipContext } from './with-resource-ownership';
