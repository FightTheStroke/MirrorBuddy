import { logger } from "@/lib/logger";
import type { Middleware } from "./types";

const log = logger.child({ module: "cron-middleware" });

/**
 * Cron authentication middleware
 *
 * Validates cron requests using CRON_SECRET from environment.
 * Expects Authorization header: `Bearer {CRON_SECRET}`
 *
 * Returns 401 if secret is missing or invalid.
 *
 * @example
 * ```ts
 * import { pipe, withCron } from '@/lib/api/middlewares';
 *
 * export const POST = pipe(
 *   withCron,
 *   async (ctx) => {
 *     // Cron authentication validated
 *     return Response.json({ status: 'success' });
 *   }
 * );
 * ```
 */
export const withCron: Middleware = async (ctx, next) => {
  const cronSecret = process.env.CRON_SECRET;

  // Allow all requests if CRON_SECRET is not configured (development)
  if (!cronSecret) {
    log.warn("CRON_SECRET not configured - allowing all requests");
    return next();
  }

  // Get Authorization header
  const authHeader = ctx.req.headers.get("authorization");
  const expectedHeader = `Bearer ${cronSecret}`;

  // Constant-time comparison to prevent timing attacks
  if (!authHeader || authHeader !== expectedHeader) {
    log.error("Invalid CRON_SECRET provided");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Valid cron secret, proceed
  return next();
};
