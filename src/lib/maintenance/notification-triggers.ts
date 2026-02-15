import { prisma } from '@/lib/db';

export interface TriggerMaintenanceNotificationParams {
  message: string;
  startTime: Date;
  endTime: Date;
}

export interface TriggerMaintenanceNotificationResult {
  recipients: number;
  created: number;
}

const MAINTENANCE_NOTIFICATION_TITLE = 'Scheduled maintenance';

export async function triggerMaintenanceNotification(
  params: TriggerMaintenanceNotificationParams,
): Promise<TriggerMaintenanceNotificationResult> {
  const users = await prisma.user.findMany({
    where: {
      disabled: false,
      username: { not: null },
      passwordHash: { not: null },
    },
    select: { id: true },
  });

  if (users.length === 0) {
    return { recipients: 0, created: 0 };
  }

  const metadata = JSON.stringify({
    subtype: 'maintenance',
    startTime: params.startTime.toISOString(),
    endTime: params.endTime.toISOString(),
  });

  const result = await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      type: 'system',
      title: MAINTENANCE_NOTIFICATION_TITLE,
      message: params.message,
      metadata,
      sentAt: new Date(),
    })),
  });

  return {
    recipients: users.length,
    created: result.count,
  };
}
