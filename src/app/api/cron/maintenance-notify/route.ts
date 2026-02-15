export const dynamic = 'force-dynamic';

import { pipe, withSentry } from '@/lib/api/middlewares';
import { withCron } from '@/lib/api/middlewares/with-cron';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { canSendTo } from '@/lib/email/preference-service';
import {
  buildMaintenanceEmailHtml,
  buildMaintenanceEmailText,
} from '@/lib/maintenance/email-template';
import { triggerMaintenanceNotification } from '@/lib/maintenance/notification-triggers';

function getWindowRange(hoursFromNowStart: number, hoursFromNowEnd: number) {
  const now = new Date();
  return {
    gte: new Date(now.getTime() + hoursFromNowStart * 60 * 60 * 1000),
    lte: new Date(now.getTime() + hoursFromNowEnd * 60 * 60 * 1000),
  };
}

export const POST = pipe(
  withSentry('/api/cron/maintenance-notify'),
  withCron,
)(async () => {
  const emailWindowRange = getWindowRange(23.5, 24.5);
  const inAppWindowRange = getWindowRange(1, 2);

  const [emailWindows, inAppWindows, users] = await Promise.all([
    prisma.maintenanceWindow.findMany({
      where: {
        cancelled: false,
        startTime: emailWindowRange,
      },
      select: {
        id: true,
        message: true,
        startTime: true,
        endTime: true,
        estimatedMinutes: true,
      },
    }),
    prisma.maintenanceWindow.findMany({
      where: {
        cancelled: false,
        startTime: inAppWindowRange,
      },
      select: {
        id: true,
        message: true,
        startTime: true,
        endTime: true,
      },
    }),
    prisma.user.findMany({
      where: {
        disabled: false,
        emailHash: { not: null },
        username: { not: null },
        passwordHash: { not: null },
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    }),
  ]);

  let emailsSent = 0;
  let recipientsChecked = 0;

  for (const window of emailWindows) {
    for (const user of users) {
      if (!user.email) {
        continue;
      }

      recipientsChecked += 1;
      const allowed = await canSendTo(user.id, 'announcements');
      if (!allowed) {
        continue;
      }

      const html = buildMaintenanceEmailHtml({
        recipientName: user.username || 'there',
        startTime: window.startTime,
        endTime: window.endTime,
        estimatedMinutes: window.estimatedMinutes,
        message: window.message,
      });

      const text = buildMaintenanceEmailText({
        recipientName: user.username || 'there',
        startTime: window.startTime,
        endTime: window.endTime,
        estimatedMinutes: window.estimatedMinutes,
        message: window.message,
      });

      const result = await sendEmail({
        to: user.email,
        subject: 'Scheduled MirrorBuddy maintenance',
        html,
        text,
      });

      if (result.success) {
        emailsSent += 1;
      }
    }
  }

  let inAppBatches = 0;
  for (const window of inAppWindows) {
    await triggerMaintenanceNotification({
      message: window.message,
      startTime: window.startTime,
      endTime: window.endTime,
    });
    inAppBatches += 1;
  }

  return Response.json({
    ok: true,
    emailWindows: emailWindows.length,
    inAppWindows: inAppWindows.length,
    recipientsChecked,
    emailsSent,
    inAppBatches,
  });
});

// Vercel Cron invokes scheduled routes with GET by default
export const GET = POST;
