import { requireCSRF } from "@/lib/security";
import type { Middleware } from "./types";

/**
 * CSRF protection middleware
 *
 * Validates CSRF token using double-submit cookie pattern.
 * Returns 403 if token is missing or invalid.
 *
 * @example
 * ```ts
 * import { pipe, withCSRF } from '@/lib/api/middlewares';
 *
 * export const POST = pipe(
 *   withCSRF,
 *   async (ctx) => {
 *     // CSRF validated
 *     return Response.json({ success: true });
 *   }
 * );
 * ```
 */
export const withCSRF: Middleware = async (ctx, next) => {
  // Validate CSRF token from cookie and header
  if (!requireCSRF(ctx.req)) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // CSRF valid, proceed
  return next();
};
