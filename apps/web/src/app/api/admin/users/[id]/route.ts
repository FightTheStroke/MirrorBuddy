import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import { createDeletedUserBackup } from '@/lib/admin/user-trash-service';
import { executeUserDataDeletion } from '@/app/api/privacy/delete-my-data/helpers';


export const revalidate = 0;
export const PATCH = pipe(
  withSentry('/api/admin/users/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const params = await ctx.params;
  const targetId = params.id;
  if (!targetId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const body = (await ctx.req.json()) as {
    disabled?: boolean;
    role?: string;
  };

  if (body.disabled === undefined && body.role === undefined) {
    return NextResponse.json({ error: 'disabled or role field is required' }, { status: 400 });
  }

  if (body.role !== undefined && body.role !== 'USER' && body.role !== 'ADMIN') {
    return NextResponse.json({ error: 'role must be USER or ADMIN' }, { status: 400 });
  }

  // Prevent admin from demoting themselves
  if (body.role === 'USER' && targetId === ctx.userId) {
    return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    logger.warn('User not found', { userId: targetId, adminId: ctx.userId });
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updateData: { disabled?: boolean; role?: 'USER' | 'ADMIN' } = {};
  if (body.disabled !== undefined) updateData.disabled = body.disabled;
  if (body.role !== undefined) updateData.role = body.role as 'USER' | 'ADMIN';

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: updateData,
  });

  // Create audit log
  const action = 'USER_STATUS_CHANGE';
  await prisma.tierAuditLog.create({
    data: {
      userId: targetId,
      adminId: ctx.userId!,
      action,
      changes: {
        old: { disabled: user.disabled, role: user.role },
        new: updateData,
      },
    },
  });

  logger.info('User updated', {
    userId: targetId,
    adminId: ctx.userId,
    changes: updateData,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      disabled: updated.disabled,
      role: updated.role,
    },
  });
});

export const DELETE = pipe(
  withSentry('/api/admin/users/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const params = await ctx.params;
  const targetId = params.id;
  if (!targetId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const body = (await ctx.req.json().catch(() => ({}))) as {
    reason?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    logger.warn('User not found', { userId: targetId, adminId: ctx.userId });
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await createDeletedUserBackup(targetId, ctx.userId!, body.reason);
  await executeUserDataDeletion(targetId);

  logger.info('Admin deleted user with backup', {
    userId: targetId,
    adminId: ctx.userId,
  });

  return NextResponse.json({ success: true });
});
