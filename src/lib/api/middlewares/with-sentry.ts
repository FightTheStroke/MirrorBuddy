import { logger } from '@/lib/logger';
import { ApiError } from '@/lib/api/pipe';
import type { Middleware } from './types';

/**
 * API error normalization middleware factory
 *
 * Wraps route handler to:
 * - Re-throw ApiError so pipe() can preserve status and payload semantics
 * - Normalize unknown exceptions into generic 500 responses
 * - Emit a single logger.error (which already forwards to Sentry)
 *
 * ApiError instances are re-thrown to let pipe() handle them with
 * proper status codes and messages. Unknown errors return generic 500.
 *
 * @param routeName - API route name for Sentry tags (e.g., '/api/chat')
 * @returns Middleware that captures errors
 */
export function withSentry(routeName: string): Middleware {
  return async (ctx, next) => {
    try {
      return await next();
    } catch (error) {
      // ApiError = operational error with explicit status.
      // Re-throw so pipe() keeps contract and response mapping.
      if (error instanceof ApiError) {
        throw error;
      }

      // Unknown error: emit once through structured logger/Sentry bridge
      logger.error(
        `API Error: ${ctx.req.method} ${routeName}`,
        {
          userId: ctx.userId,
          path: routeName,
          method: ctx.req.method,
          url: ctx.req.url,
        },
        error,
      );

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  };
}
