/**
 * Admin Safety - Block User API
 * F-15 - Human oversight intervention for high-risk AI systems
 * Compliance: AI Act Art.14 (human oversight)
 *
 * Blocks a user when repeated safety violations are detected.
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { logAdminAction } from '@/lib/admin/audit-service';
import { prisma } from '@/lib/db';
import { setUserDisabled } from '@/lib/auth/session-revocation';
import { requireActiveSession } from '@/lib/auth/session-transaction';
import { logger } from '@/lib/logger';

export const revalidate = 0;
const log = logger.child({ module: 'safety-intervention' });

export const POST = pipe(
  withSentry('/api/admin/safety/block-user'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body: unknown = await ctx.req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }
  const userId = 'userId' in body ? body.userId : undefined;
  const reason = 'reason' in body ? body.reason : undefined;
  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  if (reason !== undefined && typeof reason !== 'string') {
    return NextResponse.json({ error: 'Reason must be a string' }, { status: 400 });
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updated = await setUserDisabled(userId, true, requireActiveSession(ctx.authSession));

  // Log the admin action
  await logAdminAction({
    action: 'BLOCK_USER',
    entityType: 'User',
    entityId: userId,
    adminId: ctx.userId!,
    details: {
      reason: reason || 'Safety intervention',
      previousState: user.disabled,
    },
  });

  log.info('User blocked via safety intervention', {
    userId,
    adminId: ctx.userId,
    reason,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      username: updated.username,
      disabled: updated.disabled,
    },
  });
});
