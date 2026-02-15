import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import { logAdminAction } from '@/lib/admin/audit-service';
import { listMaintenanceWindows } from '@/lib/maintenance/maintenance-service';
import { checkOverlap } from '@/lib/maintenance/overlap-validation';

type CreateMaintenanceBody = {
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

export const revalidate = 0;

export const GET = pipe(
  withSentry('/api/admin/maintenance'),
  withAdmin,
)(async (ctx) => {
  const url = new URL(ctx.req.url);
  const includeCompleted = url.searchParams.get('includeCompleted') === 'true';

  const windows = await listMaintenanceWindows({
    includeCancelled: includeCompleted,
  });

  return NextResponse.json({ success: true, data: windows });
});

export const POST = pipe(
  withSentry('/api/admin/maintenance'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = (await ctx.req.json()) as CreateMaintenanceBody;
  const startTime = parseDate(body.startTime);
  const endTime = parseDate(body.endTime);
  const message = body.message?.trim();
  const now = new Date();

  if (!startTime || !endTime) {
    return NextResponse.json({ error: 'startTime and endTime are required' }, { status: 400 });
  }

  if (startTime >= endTime) {
    return NextResponse.json({ error: 'startTime must be before endTime' }, { status: 400 });
  }

  if (startTime <= now) {
    return NextResponse.json({ error: 'startTime must be in the future' }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const overlap = await checkOverlap(startTime, endTime);
  if (overlap.overlaps) {
    return NextResponse.json(
      {
        error: 'Maintenance window overlaps with an existing scheduled or active window',
        conflictingWindowId: overlap.conflictingWindow?.id,
      },
      { status: 409 },
    );
  }

  const estimatedMinutes =
    body.estimatedMinutes ??
    Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000)));

  const maintenanceWindow = await prisma.maintenanceWindow.create({
    data: {
      startTime,
      endTime,
      message,
      severity: body.severity ?? 'medium',
      estimatedMinutes,
      createdBy: ctx.userId || 'unknown',
      isActive: false,
      cancelled: false,
    },
  });

  await logAdminAction({
    action: 'CREATE_MAINTENANCE',
    entityType: 'MaintenanceWindow',
    entityId: maintenanceWindow.id,
    adminId: ctx.userId || 'unknown',
  });

  return NextResponse.json({ success: true, data: maintenanceWindow }, { status: 201 });
});
