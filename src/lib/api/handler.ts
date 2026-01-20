// ============================================================================
// API HANDLER WRAPPER
// Consistent error handling and logging for API routes
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type HandlerFn = (req: NextRequest) => Promise<NextResponse>;

interface ApiErrorResponse {
  error: string;
  code?: string;
}

/**
 * Wrap API route handlers with consistent error handling
 *
 * @example
 * export const GET = apiHandler(async (req) => {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * });
 */
export function apiHandler(fn: HandlerFn): HandlerFn {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const { pathname } = req.nextUrl;
    const method = req.method;

    try {
      const response = await fn(req);

      // Log successful requests (debug level)
      logger.debug("API request completed", {
        method,
        path: pathname,
        status: response.status,
        durationMs: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      // Log errors with full context
      logger.error("API request failed", {
        method,
        path: pathname,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: Date.now() - startTime,
      });

      // Return generic error to client (don't leak internals)
      const errorResponse: ApiErrorResponse = {
        error: "Internal server error",
      };

      return NextResponse.json(errorResponse, { status: 500 });
    }
  };
}

/**
 * Handler with custom error responses
 */
export function apiHandlerWithErrors(
  fn: HandlerFn,
  errorMap?: Map<string, { status: number; message: string }>,
): HandlerFn {
  return apiHandler(async (req) => {
    try {
      return await fn(req);
    } catch (error) {
      if (error instanceof Error && errorMap) {
        const mapped = errorMap.get(error.name);
        if (mapped) {
          return NextResponse.json(
            { error: mapped.message },
            { status: mapped.status },
          );
        }
      }
      throw error; // Re-throw for outer handler
    }
  });
}
