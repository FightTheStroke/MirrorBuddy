import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { logAdminAction } from '@/lib/admin/audit-service';
import {
  activateMaintenanceWindow,
  createMaintenanceWindow,
  deactivateMaintenanceWindow,
} from '@/lib/maintenance/maintenance-service';

type ToggleMaintenanceBody = {
  windowId?: string;
  activate?: boolean;
  message?: string;
  severity?: string;
  estimatedMinutes?: number;
};

function getEstimatedMinutes(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return 60;
  }

  return Math.round(value);
}

export const POST = pipe(
  withSentry('/api/admin/maintenance/toggle'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  let body: ToggleMaintenanceBody;

  try {
    body = (await ctx.req.json()) as ToggleMaintenanceBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  if (typeof body.activate !== 'boolean') {
    return NextResponse.json({ error: 'activate must be a boolean' }, { status: 400 });
  }

  const windowId = body.windowId?.trim();

  if (!body.activate && !windowId) {
    return NextResponse.json(
      { error: 'windowId is required when deactivate is requested' },
      { status: 400 },
    );
  }

  if (body.activate) {
    let targetWindowId = windowId;

    if (!targetWindowId) {
      const message = body.message?.trim();
      if (!message) {
        return NextResponse.json(
          { error: 'message is required when activating ad-hoc maintenance' },
          { status: 400 },
        );
      }

      const estimatedMinutes = getEstimatedMinutes(body.estimatedMinutes);
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + estimatedMinutes * 60 * 1000);

      const created = await createMaintenanceWindow({
        startTime,
        endTime,
        message,
        severity: body.severity ?? 'medium',
        estimatedMinutes,
        createdBy: ctx.userId || 'unknown',
        isActive: false,
        cancelled: false,
      });

      targetWindowId = created.id;
    }

    const updatedWindow = await activateMaintenanceWindow(targetWindowId);

    await logAdminAction({
      action: 'ACTIVATE_MAINTENANCE',
      entityType: 'MaintenanceWindow',
      entityId: targetWindowId,
      adminId: ctx.userId || 'unknown',
    });

    return NextResponse.json({ success: true, data: updatedWindow });
  }

  const updatedWindow = await deactivateMaintenanceWindow(windowId!);

  await logAdminAction({
    action: 'DEACTIVATE_MAINTENANCE',
    entityType: 'MaintenanceWindow',
    entityId: windowId!,
    adminId: ctx.userId || 'unknown',
  });

  return NextResponse.json({ success: true, data: updatedWindow });
});
