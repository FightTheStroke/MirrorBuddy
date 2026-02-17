/**
 * Parent Crisis Notification Service
 *
 * Sends crisis alert emails to parent/guardian when crisis is detected.
 *
 * Lookup order:
 * 1. CoppaConsent (for <13 users) - parentEmail where consentGranted=true
 * 2. Settings.guardianEmail (for >13 users, optional)
 * 3. If no contact found: log 'no_parent_contact', admin handles manually
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { buildCrisisParentEmail } from '@/lib/email/templates/crisis-parent-notification';

const log = logger.child({ module: 'parent-notifier' });

export interface CrisisNotificationParams {
  userId: string;
  category: string;
  severity: string;
  maestroId?: string;
  timestamp: Date;
  locale: string;
}

/**
 * Notify parent/guardian of detected crisis
 *
 * Sends email to parent with crisis alert (no message content included).
 * Updates SafetyEvent.parentNotified flag on success.
 */
export async function notifyParentOfCrisis(params: CrisisNotificationParams): Promise<void> {
  const { userId, severity, maestroId, timestamp, locale } = params;

  try {
    // 1. Check CoppaConsent for <13 users
    const coppaConsent = await prisma.coppaConsent.findFirst({
      where: {
        userId,
        consentGranted: true,
        parentEmail: { not: null },
      },
      select: { parentEmail: true },
    });

    // 2. Check Settings for >13 users guardian email
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { guardianEmail: true },
    });

    const parentEmail = coppaConsent?.parentEmail || settings?.guardianEmail;

    if (!parentEmail) {
      log.info('No parent contact found for crisis notification', {
        userId: userId.slice(0, 8),
        reason: 'no_parent_contact',
      });
      return;
    }

    // Build email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mirrorbuddy.it';
    const email = buildCrisisParentEmail({
      locale: locale || 'it',
      severity,
      timestamp,
      maestroName: maestroId,
      parentDashboardUrl: `${baseUrl}/${locale || 'it'}/parent-dashboard`,
    });

    // Send email via Resend
    const { sendEmail } = await import('@/lib/email');
    const result = await sendEmail({
      to: parentEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (!result.success) {
      log.error('Failed to send parent crisis notification', {
        userId: userId.slice(0, 8),
        error: result.error,
      });
      return;
    }

    // Update SafetyEvent parentNotified flag
    // Find the most recent crisis event for this user
    const recentEvent = await prisma.safetyEvent.findFirst({
      where: {
        userId,
        category: 'crisis',
        parentNotified: false,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (recentEvent) {
      await prisma.safetyEvent.update({
        where: { id: recentEvent.id },
        data: {
          parentNotified: true,
          parentNotifiedAt: new Date(),
        },
      });
    }

    log.info('Parent crisis notification sent', {
      userId: userId.slice(0, 8),
      severity,
      messageId: result.messageId,
    });
  } catch (err) {
    log.error('Failed to send parent crisis notification', {
      userId: userId.slice(0, 8),
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
