import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { ApiError } from "@/lib/api/pipe";
import type { Middleware } from "./types";

/**
 * Sentry error capture middleware factory
 *
 * Wraps route handler to automatically capture 5xx errors to Sentry.
 * Logs all errors with structured context.
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
      // ApiError = intentional operational error with specific status/message.
      // Re-throw so pipe() returns the proper status code and message.
      // Only capture 5xx ApiErrors to Sentry (4xx are expected).
      if (error instanceof ApiError) {
        if (error.statusCode >= 500) {
          Sentry.captureException(error, {
            tags: { api: routeName, method: ctx.req.method },
            extra: { url: ctx.req.url, userId: ctx.userId },
          });
        }
        throw error;
      }

      // Unknown error: capture to Sentry and return generic 500
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

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`API Error: ${ctx.req.method} ${routeName}`, {
        error: errorMessage,
        userId: ctx.userId,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  };
}
