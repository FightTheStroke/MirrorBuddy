import { validateAdminReadOnlyAuth } from '@/lib/auth/server';
import type { Middleware } from './types';

/**
 * Admin read-only authentication middleware
 *
 * Accepts ADMIN and ADMIN_READONLY for admin GET endpoints.
 */
export const withAdminReadOnly: Middleware = async (ctx, next) => {
  const auth = await validateAdminReadOnlyAuth();

  if (!auth.authenticated || !auth.userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!auth.canAccessAdminReadOnly) {
    return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  ctx.userId = auth.userId;
  ctx.isAdmin = true;

  return next();
};
