import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { logAdminAction } from '@/lib/admin/audit-service';
import { prisma } from '@/lib/db';
import { checkOverlap } from '@/lib/maintenance/overlap-validation';

type UpdateMaintenanceBody = {
  startTime?: string;
  endTime?: string;
  message?: string;
  severity?: string;
  estimatedMinutes?: number;
};

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getIdFromUrl(urlString: string): string | null {
  const url = new URL(urlString);
  return url.pathname.split('/').pop() || null;
}

export const revalidate = 0;

export const PATCH = pipe(
  withSentry('/api/admin/maintenance/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const id = getIdFromUrl(ctx.req.url);
  if (!id) {
    return NextResponse.json({ error: 'Maintenance window ID is required' }, { status: 400 });
  }

  const existing = await prisma.maintenanceWindow.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Maintenance window not found' }, { status: 404 });
  }

  const body = (await ctx.req.json()) as UpdateMaintenanceBody;

  const parsedStartTime =
    body.startTime !== undefined ? parseDate(body.startTime) : existing.startTime;
  const parsedEndTime = body.endTime !== undefined ? parseDate(body.endTime) : existing.endTime;
  if (!parsedStartTime || !parsedEndTime) {
    return NextResponse.json({ error: 'Invalid startTime or endTime' }, { status: 400 });
  }

  if (parsedStartTime >= parsedEndTime) {
    return NextResponse.json({ error: 'startTime must be before endTime' }, { status: 400 });
  }

  if (body.startTime !== undefined || body.endTime !== undefined) {
    const overlap = await checkOverlap(parsedStartTime, parsedEndTime, id);
    if (overlap.overlaps) {
      return NextResponse.json(
        {
          error: 'Maintenance window overlaps with an existing scheduled or active window',
          conflictingWindowId: overlap.conflictingWindow?.id,
        },
        { status: 409 },
      );
    }
  }

  const updatedWindow = await prisma.maintenanceWindow.update({
    where: { id },
    data: {
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      message: body.message !== undefined ? body.message : existing.message,
      severity: body.severity !== undefined ? body.severity : existing.severity,
      estimatedMinutes:
        body.estimatedMinutes !== undefined ? body.estimatedMinutes : existing.estimatedMinutes,
    },
  });

  await logAdminAction({
    action: 'UPDATE_MAINTENANCE',
    entityType: 'MaintenanceWindow',
    entityId: id,
    adminId: ctx.userId || 'unknown',
  });

  return NextResponse.json({ success: true, data: updatedWindow });
});

export const DELETE = pipe(
  withSentry('/api/admin/maintenance/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const id = getIdFromUrl(ctx.req.url);
  if (!id) {
    return NextResponse.json({ error: 'Maintenance window ID is required' }, { status: 400 });
  }

  const existing = await prisma.maintenanceWindow.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Maintenance window not found' }, { status: 404 });
  }

  const cancelledWindow = await prisma.maintenanceWindow.update({
    where: { id },
    data: { cancelled: true, isActive: false },
  });

  await logAdminAction({
    action: 'CANCEL_MAINTENANCE',
    entityType: 'MaintenanceWindow',
    entityId: id,
    adminId: ctx.userId || 'unknown',
  });

  return NextResponse.json({ success: true, data: cancelledWindow });
});
