/**
 * Centralized Sentry utilities for MirrorBuddy
 *
 * Provides:
 * - API route error wrapping
 * - Server component error capture
 * - Custom error context and tags
 * - Performance monitoring helpers
 */

import * as Sentry from "@sentry/nextjs";
import type { NextRequest, NextResponse } from "next/server";

// Re-export Sentry for convenience
export { Sentry };

/**
 * Error context for Sentry
 */
interface SentryErrorContext {
  /** Error type tag for filtering in Sentry */
  errorType?: string;
  /** User ID if available */
  userId?: string | null;
  /** Request path */
  path?: string;
  /** Additional tags */
  tags?: Record<string, string>;
  /** Additional context */
  extra?: Record<string, unknown>;
}

/**
 * Capture an exception with standard context
 */
export function captureError(
  error: unknown,
  context: SentryErrorContext = {},
): string {
  const eventId = Sentry.captureException(error, {
    tags: {
      errorType: context.errorType || "unknown",
      ...(context.userId && { userId: context.userId }),
      ...(context.path && { path: context.path }),
      ...context.tags,
    },
    extra: context.extra,
  });

  return eventId;
}

/**
 * Capture a message with standard context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context: SentryErrorContext = {},
): string {
  const eventId = Sentry.captureMessage(message, {
    level,
    tags: {
      errorType: context.errorType || "message",
      ...context.tags,
    },
    extra: context.extra,
  });

  return eventId;
}

/**
 * Wrap an API route handler with Sentry error tracking
 *
 * @example
 * ```ts
 * export const GET = withSentryApi(async (request) => {
 *   // Your handler code
 *   return NextResponse.json({ data });
 * }, "GET /api/users");
 * ```
 */
export function withSentryApi<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>,
  routeName: string,
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    return Sentry.withIsolationScope(async (scope) => {
      scope.setTag("route", routeName);
      scope.setTag("method", request.method);

      // Extract user ID from headers if available
      const userId = request.headers.get("x-user-id");
      if (userId) {
        scope.setUser({ id: userId });
      }

      try {
        return await handler(request);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: "api-route",
            route: routeName,
            method: request.method,
          },
          extra: {
            url: request.url,
            headers: Object.fromEntries(
              [...request.headers.entries()].filter(
                ([key]) =>
                  !key.toLowerCase().includes("authorization") &&
                  !key.toLowerCase().includes("cookie"),
              ),
            ),
          },
        });
        throw error;
      }
    });
  };
}

/**
 * Wrap a server action with Sentry error tracking
 *
 * @example
 * ```ts
 * export const submitForm = withSentryAction(async (formData) => {
 *   // Your action code
 * }, "submitForm");
 * ```
 */
export function withSentryAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  actionName: string,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return Sentry.withIsolationScope(async (scope) => {
      scope.setTag("action", actionName);
      scope.setTag("errorType", "server-action");

      try {
        return await action(...args);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            errorType: "server-action",
            action: actionName,
          },
        });
        throw error;
      }
    });
  };
}

/**
 * Create a Sentry transaction for performance monitoring
 *
 * @example
 * ```ts
 * const transaction = startTransaction("process-document", "task");
 * try {
 *   // Long-running operation
 *   transaction.setStatus("ok");
 * } catch (error) {
 *   transaction.setStatus("internal_error");
 *   throw error;
 * } finally {
 *   transaction.end();
 * }
 * ```
 */
export function startTransaction(
  name: string,
  op: string,
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = "info",
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for all subsequent errors
 */
export function setUser(user: {
  id: string;
  email?: string;
  tier?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    tier: user.tier,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Set custom tags that persist for the session
 */
export function setTags(tags: Record<string, string>): void {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Log to Sentry without throwing (for non-critical issues)
 */
export function logWarning(
  message: string,
  context: SentryErrorContext = {},
): void {
  captureMessage(message, "warning", context);
}

/**
 * Log info to Sentry (for important events)
 */
export function logInfo(
  message: string,
  context: SentryErrorContext = {},
): void {
  captureMessage(message, "info", context);
}

/**
 * Critical asset paths that MUST load successfully
 * Add any asset that, if missing, breaks user experience
 */
export const CRITICAL_ASSETS = [
  "/logo-brain.png",
  "/maestri/euclide.webp",
  "/maestri/galileo.webp",
  "/maestri/darwin.webp",
  "/avatars/melissa.webp",
] as const;

/**
 * Capture a resource loading failure to Sentry
 *
 * Use this when images, fonts, or other critical resources fail to load.
 * This captures 404s, network errors, and CORS issues that browsers
 * normally don't report as JavaScript errors.
 *
 * @example
 * ```tsx
 * <img
 *   src="/logo.png"
 *   onError={(e) => captureResourceError(e.currentTarget.src, 'image')}
 * />
 * ```
 */
export function captureResourceError(
  resourceUrl: string,
  resourceType: "image" | "font" | "script" | "stylesheet" | "other",
  additionalContext?: Record<string, unknown>,
): string {
  const isCritical = CRITICAL_ASSETS.some((asset) =>
    resourceUrl.includes(asset),
  );

  return captureMessage(
    `Resource failed to load: ${resourceUrl}`,
    isCritical ? "error" : "warning",
    {
      errorType: "resource-load-failure",
      tags: {
        resourceType,
        isCritical: String(isCritical),
        resourcePath: new URL(resourceUrl, "http://localhost").pathname,
      },
      extra: {
        fullUrl: resourceUrl,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "server",
        ...additionalContext,
      },
    },
  );
}

/**
 * Check if a resource URL is accessible (returns 200)
 *
 * Use in health checks or synthetic monitoring to verify
 * critical assets are available before users hit them.
 *
 * @example
 * ```ts
 * const results = await checkCriticalAssets();
 * const failures = results.filter(r => !r.ok);
 * if (failures.length > 0) {
 *   // Alert or log
 * }
 * ```
 */
export async function checkCriticalAssets(
  baseUrl?: string,
): Promise<Array<{ asset: string; ok: boolean; status?: number }>> {
  const base = baseUrl || (typeof window !== "undefined" ? "" : "");

  const results = await Promise.all(
    CRITICAL_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(`${base}${asset}`, {
          method: "HEAD",
          cache: "no-cache",
        });
        return {
          asset,
          ok: response.ok,
          status: response.status,
        };
      } catch {
        return {
          asset,
          ok: false,
          status: undefined,
        };
      }
    }),
  );

  // Report failures to Sentry
  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    captureMessage(`Critical assets unavailable: ${failures.length} failures`, "error", {
      errorType: "critical-assets-check",
      tags: {
        failureCount: String(failures.length),
      },
      extra: {
        failures: failures.map((f) => ({ asset: f.asset, status: f.status })),
        checkedAt: new Date().toISOString(),
      },
    });
  }

  return results;
}
