import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import type { Middleware } from "./types";

/**
 * Sentry error capture middleware factory
 *
 * Wraps route handler to automatically capture 5xx errors to Sentry.
 * Logs all errors with structured context.
 *
 * @param routeName - API route name for Sentry tags (e.g., '/api/chat')
 * @returns Middleware that captures errors
 *
 * @example
 * ```ts
 * import { pipe, withSentry } from '@/lib/api/middlewares';
 *
 * export const POST = pipe(
 *   withSentry('/api/my-route'),
 *   async (ctx) => {
 *     // Errors automatically captured to Sentry
 *     throw new Error('Something went wrong');
 *   }
 * );
 * ```
 */
export function withSentry(routeName: string): Middleware {
  return async (ctx, next) => {
    try {
      return await next();
    } catch (error) {
      // Capture to Sentry with route context
      Sentry.captureException(error, {
        tags: {
          api: routeName,
          method: ctx.req.method,
        },
        extra: {
          url: ctx.req.url,
          userId: ctx.userId,
        },
      });

      // Log error with structured context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`API Error: ${ctx.req.method} ${routeName}`, {
        error: errorMessage,
        userId: ctx.userId,
      });

      // Return 500 response
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  };
}
