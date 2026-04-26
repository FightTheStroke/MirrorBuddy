import { logger } from '@/lib/logger';
import { timingSafeEqual } from 'node:crypto';
import type { Middleware } from './types';

const log = logger.child({ module: 'cron-middleware' });

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
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  // Allow missing secret only in local/dev-like environments.
  // In production, missing CRON_SECRET is a hard failure.
  if (!cronSecret) {
    if (isDevOrTest) {
      log.warn('CRON_SECRET not configured - allowing all requests');
      return next();
    }

    log.error('CRON_SECRET not configured in non-development environment');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get Authorization header
  const authHeader = ctx.req.headers.get('authorization');
  const expectedHeader = `Bearer ${cronSecret}`;

  // Constant-time comparison to prevent timing attacks
  const authBuffer = Buffer.from(authHeader || '', 'utf8');
  const expectedBuffer = Buffer.from(expectedHeader, 'utf8');
  const isValid =
    authBuffer.length === expectedBuffer.length && timingSafeEqual(authBuffer, expectedBuffer);

  if (!isValid) {
    log.error('Invalid CRON_SECRET provided');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Valid cron secret, proceed
  return next();
};
