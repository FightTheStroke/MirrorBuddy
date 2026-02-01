import { validateAuth } from "@/lib/auth/session-auth";
import type { Middleware } from "./types";

/**
 * Authentication middleware
 *
 * Validates user session and injects userId into context.
 * Returns 401 if not authenticated.
 *
 * @example
 * ```ts
 * import { pipe, withAuth } from '@/lib/api/middlewares';
 *
 * export const GET = pipe(
 *   withAuth,
 *   async (ctx) => {
 *     // ctx.userId is guaranteed to be set
 *     return Response.json({ userId: ctx.userId });
 *   }
 * );
 * ```
 */
export const withAuth: Middleware = async (ctx, next) => {
  const auth = await validateAuth();

  if (!auth.authenticated || !auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Inject userId into context
  ctx.userId = auth.userId;

  return next();
};
