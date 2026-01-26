/**
 * API Error Handler with Sentry Integration
 * Ensures ALL API errors are captured by Sentry
 *
 * Two usage patterns:
 *
 * 1. Wrapper (recommended for new routes):
 * ```ts
 * import { apiHandler } from '@/lib/api/error-handler';
 *
 * export const GET = apiHandler(async (request) => {
 *   // Your logic - throw errors, they'll be captured
 *   return NextResponse.json({ data });
 * });
 * ```
 *
 * 2. Error response helper (for existing routes - find/replace):
 * ```ts
 * import { errorResponse } from '@/lib/api/error-handler';
 *
 * // Replace: return NextResponse.json({ error: 'Failed' }, { status: 500 });
 * // With:    return errorResponse('Failed', 500, error, '/api/my-route');
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

/**
 * Custom API Error with status code
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
 * Standard error response format
 */
interface ErrorResponse {
  error: string;
  details?: string;
  requestId?: string;
}

/**
 * Extract route info for Sentry tags
 */
function getRouteInfo(request: NextRequest): { path: string; method: string } {
  const url = new URL(request.url);
  return {
    path: url.pathname,
    method: request.method,
  };
}

/**
 * Type for API route handler
 */
type ApiRouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

/**
 * Wrap API route handler with automatic error handling and Sentry capture
 *
 * - Catches ALL errors (sync and async)
 * - Sends to Sentry with route context
 * - Returns consistent error response format
 * - Logs errors with structured context
 */
export function apiHandler(handler: ApiRouteHandler): ApiRouteHandler {
  return async (request, context) => {
    const routeInfo = getRouteInfo(request);

    try {
      return await handler(request, context);
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
            url: request.url,
            statusCode,
          },
        });
      }

      // Log error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`API Error: ${routeInfo.method} ${routeInfo.path}`, {
        error: errorMessage,
        statusCode,
      });

      // Build response
      const response: ErrorResponse = {
        error: errorMessage,
      };

      if (error instanceof ApiError && error.details) {
        response.details = String(error.details);
      }

      return NextResponse.json(response, { status: statusCode });
    }
  };
}

/**
 * Helper to throw common API errors
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

/**
 * Create error response with automatic Sentry capture for 5xx errors
 *
 * Drop-in replacement for:
 *   return NextResponse.json({ error: 'msg' }, { status: 500 });
 *
 * Usage:
 *   return errorResponse('Failed to process', 500, error, '/api/my-route');
 */
export function errorResponse(
  message: string,
  statusCode: number,
  originalError?: unknown,
  route?: string,
): NextResponse {
  // Capture 5xx errors to Sentry
  if (statusCode >= 500) {
    const errorToCapture = originalError || new Error(message);
    Sentry.captureException(errorToCapture, {
      tags: {
        api: route || "unknown",
        statusCode: String(statusCode),
      },
      extra: {
        message,
        originalError: originalError ? String(originalError) : undefined,
      },
    });
  }

  // Log
  logger.error(`API Error [${statusCode}]: ${message}`, {
    route,
    error: originalError ? String(originalError) : undefined,
  });

  // Build response
  const body: Record<string, unknown> = { error: message };
  if (originalError && statusCode >= 500) {
    body.details = String(originalError);
  }

  return NextResponse.json(body, { status: statusCode });
}
