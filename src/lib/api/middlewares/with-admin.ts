import { validateAdminAuth } from "@/lib/auth/server";
import type { Middleware } from "./types";

/**
 * Admin authentication middleware
 *
 * Validates admin session and injects userId + isAdmin into context.
 * Returns 401 if not authenticated, 403 if not admin.
 *
 * @example
 * ```ts
 * import { pipe, withAdmin } from '@/lib/api/middlewares';
 *
 * export const DELETE = pipe(
 *   withAdmin,
 *   async (ctx) => {
 *     // ctx.userId and ctx.isAdmin are guaranteed to be set
 *     return Response.json({ success: true });
 *   }
 * );
 * ```
 */
export const withAdmin: Middleware = async (ctx, next) => {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!auth.isAdmin) {
    return new Response(
      JSON.stringify({ error: "Forbidden: admin access required" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Inject userId and isAdmin into context
  ctx.userId = auth.userId;
  ctx.isAdmin = auth.isAdmin;

  return next();
};
