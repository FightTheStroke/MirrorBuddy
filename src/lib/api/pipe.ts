/**
 * Composable API Handler Pipeline
 *
 * Unified middleware system that merges functionality from:
 * - src/lib/api/handler.ts (logging)
 * - src/lib/api/error-handler.ts (Sentry + ApiError)
 * - src/lib/auth/middleware.ts (auth pattern)
 *
 * Usage:
 * ```ts
 * export const GET = pipe(
 *   withAuth,
 *   withLogging
 * )(async (ctx) => {
 *   const { userId } = ctx;
 *   return NextResponse.json({ userId });
 * });
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

/**
 * Custom API Error with status code
 * Re-exported from error-handler.ts for convenience
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Middleware context accumulates typed properties through the pipeline
 * Each middleware can add properties that are available to downstream middlewares and handler
 */
export interface MiddlewareContext {
  req: NextRequest;
  params: Promise<Record<string, string>>;
  // Extended by middlewares:
  userId?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

/**
 * Middleware function signature
 * @param ctx - Accumulated context
 * @param next - Call next middleware/handler in chain
 * @returns Response (can short-circuit by not calling next())
 */
export type Middleware = (
  ctx: MiddlewareContext,
  next: () => Promise<Response>,
) => Promise<Response>;

/**
 * Handler function signature (final handler after all middlewares)
 */
export type Handler = (ctx: MiddlewareContext) => Promise<Response>;

/**
 * Next.js route handler signature with optional route context
 */
export type RouteHandler = (
  req: NextRequest,
  routeContext?: { params: Promise<Record<string, string>> },
) => Promise<Response>;

/**
 * Extract route info for logging and Sentry tags
 */
function getRouteInfo(req: NextRequest): { path: string; method: string } {
  // Use optional chaining for test compatibility (plain Request objects lack nextUrl)
  const pathname = req.nextUrl?.pathname ?? new URL(req.url).pathname;
  return {
    path: pathname,
    method: req.method,
  };
}

/**
 * Compose middlewares into a single API route handler
 *
 * Features:
 * - Logging with timing (startTime, duration, path, method)
 * - Error boundary with Sentry capture for 5xx errors
 * - Context accumulation through middleware chain
 * - Support for dynamic route params via routeContext
 * - Streaming Response passthrough (no wrapping)
 *
 * @param middlewares - Variadic list of middleware functions
 * @returns Curried function that accepts handler and returns Next.js route handler
 *
 * @example
 * ```ts
 * const authMiddleware: Middleware = async (ctx, next) => {
 *   const auth = await validateAuth();
 *   if (!auth.authenticated) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   ctx.userId = auth.userId;
 *   return next();
 * };
 *
 * export const GET = pipe(authMiddleware)(async (ctx) => {
 *   return NextResponse.json({ userId: ctx.userId });
 * });
 * ```
 */
export function pipe(...middlewares: Middleware[]) {
  return (handler: Handler): RouteHandler => {
    return async (
      req: NextRequest,
      routeContext?: { params: Promise<Record<string, string>> },
    ): Promise<Response> => {
      const startTime = Date.now();
      const routeInfo = getRouteInfo(req);

      try {
        // Initialize context
        const ctx: MiddlewareContext = {
          req,
          params: routeContext?.params ?? Promise.resolve({}),
        };

        // Build middleware chain (reverse order, so they execute in correct order)
        let index = 0;

        const next = async (): Promise<Response> => {
          // If we've executed all middlewares, call the final handler
          if (index >= middlewares.length) {
            return handler(ctx);
          }

          // Execute current middleware and increment index
          const currentMiddleware = middlewares[index++];
          return currentMiddleware(ctx, next);
        };

        // Execute the chain
        const response = await next();

        // Log successful requests (debug level)
        logger.debug("API request completed", {
          method: routeInfo.method,
          path: routeInfo.path,
          status: response.status,
          durationMs: Date.now() - startTime,
        });

        return response;
      } catch (error) {
        // Determine status code
        const statusCode = error instanceof ApiError ? error.statusCode : 500;

        // Only capture 5xx errors to Sentry (client errors are expected)
        if (statusCode >= 500) {
          Sentry.captureException(error, {
            tags: {
              api: routeInfo.path,
              method: routeInfo.method,
            },
            extra: {
              url: req.url,
              statusCode,
            },
          });
        }

        // Log error with context
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          `API Error: ${routeInfo.method} ${routeInfo.path}`,
          { statusCode },
          error,
        );

        // Build error response
        const response: Record<string, unknown> = {
          error: errorMessage,
        };

        if (error instanceof ApiError && error.details) {
          response.details = String(error.details);
        }

        return NextResponse.json(response, { status: statusCode });
      }
    };
  };
}

/**
 * Helper functions to create common API errors
 * Re-exported from error-handler.ts for convenience
 */
export const errors = {
  unauthorized: (message = "Unauthorized") => new ApiError(message, 401),
  forbidden: (message = "Forbidden") => new ApiError(message, 403),
  notFound: (message = "Not found") => new ApiError(message, 404),
  badRequest: (message: string, details?: unknown) =>
    new ApiError(message, 400, details),
  internal: (message: string, details?: unknown) =>
    new ApiError(message, 500, details),
};
