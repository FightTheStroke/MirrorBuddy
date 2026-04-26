/**
 * Trial Nurturing Cron Job
 * Sends automated emails for trial usage nudges and inactivity reminders
 * Plan 069 - Conversion Funnel Email Automation
 *
 * Runs daily via Vercel Cron (9 AM CET)
 *
 * F-12: Email automatica quando trial raggiunge 70% utilizzo
 * F-13: Reminder email dopo 7 giorni inattività trial
 */

export const dynamic = 'force-dynamic';

import { pipe, withSentry, withCron } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import {
  getTrialUsageNudgeTemplate,
  type TrialUsageNudgeData,
} from '@/lib/email/templates/trial-templates';
import { recordStageTransition } from '@/lib/funnel';

const log = logger.child({ module: 'cron-trial-nurturing' });

const TRIAL_LIMITS = {
  chats: 10,
  voiceMinutes: 5,
  tools: 10,
};

const USAGE_THRESHOLD = 0.7; // 70%
const INACTIVITY_DAYS = 7;

interface NurturingResult {
  status: 'success' | 'error';
  nudgesSent: number;
  remindersSent: number;
  errors: string[];
}

/**
 * Calculate highest usage percentage across all trial limits
 */
function calculateUsagePercent(session: {
  chatsUsed: number;
  voiceSecondsUsed: number;
  toolsUsed: number;
}): number {
  const chatPercent = session.chatsUsed / TRIAL_LIMITS.chats;
  const voicePercent = session.voiceSecondsUsed / 60 / TRIAL_LIMITS.voiceMinutes;
  const toolPercent = session.toolsUsed / TRIAL_LIMITS.tools;

  return Math.max(chatPercent, voicePercent, toolPercent);
}

/**
 * Extract name from email or use default
 */
function extractNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];

  // Remove dots, underscores, numbers
  const cleaned = localPart.replace(/[._\d]+/g, ' ').trim();

  // Capitalize first letter
  if (cleaned) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return 'Studente';
}

/**
 * Main cron handler - runs daily
 */
export const POST = pipe(
  withSentry('/api/cron/trial-nurturing'),
  withCron,
)(async () => {
  const result: NurturingResult = {
    status: 'success',
    nudgesSent: 0,
    remindersSent: 0,
    errors: [],
  };

  // Skip cron in non-production environments (staging/preview)
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    log.info(`[CRON] Skipping trial-nurturing - not production (env: ${process.env.VERCEL_ENV})`);
    return Response.json(
      {
        skipped: true,
        reason: 'Not production environment',
        environment: process.env.VERCEL_ENV,
      },
      { status: 200 },
    );
  }

  log.info('Trial nurturing cron started');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  // ============================================
  // 1. USAGE NUDGES (F-12): 70%+ usage emails
  // ============================================
  const trialsToNudge = await prisma.trialSession.findMany({
    where: {
      email: { not: null },
      emailCollectedAt: { not: null },
    },
    select: {
      id: true,
      visitorId: true,
      email: true,
      chatsUsed: true,
      voiceSecondsUsed: true,
      toolsUsed: true,
    },
  });

  log.info(`Found ${trialsToNudge.length} trials with email to check`);

  for (const session of trialsToNudge) {
    const usagePercent = calculateUsagePercent(session);

    // Skip if below 70% threshold
    if (usagePercent < USAGE_THRESHOLD) continue;

    // Check if already sent nudge via funnel event
    // Use string_contains for JSON field filtering (Prisma PostgreSQL)
    const alreadyNudged = await prisma.funnelEvent.findFirst({
      where: {
        visitorId: session.visitorId,
        stage: 'LIMIT_HIT',
        metadata: {
          string_contains: '"emailSent":true',
        },
      },
    });

    if (alreadyNudged) continue;

    try {
      const name = extractNameFromEmail(session.email!);
      const emailData: TrialUsageNudgeData = {
        email: session.email!,
        name,
        usagePercent: Math.round(usagePercent * 100),
        chatsUsed: session.chatsUsed,
        chatsLimit: TRIAL_LIMITS.chats,
        voiceMinutesUsed: Math.round(session.voiceSecondsUsed / 60),
        voiceMinutesLimit: TRIAL_LIMITS.voiceMinutes,
        betaRequestUrl: `${process.env.NEXT_PUBLIC_APP_URL}/beta-request`,
      };

      const emailTemplate = getTrialUsageNudgeTemplate(emailData);

      const sendResult = await sendEmail({
        to: emailTemplate.to,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Unknown email error');
      }

      // Record in funnel
      await recordStageTransition({ visitorId: session.visitorId }, 'LIMIT_HIT', {
        emailSent: true,
        usagePercent: emailData.usagePercent,
      });

      result.nudgesSent++;
      log.info('Sent trial nudge email', {
        visitorId: session.visitorId,
        email: session.email,
        usagePercent: emailData.usagePercent,
      });
    } catch (err) {
      const errorMsg = `Nudge to ${session.email}: ${err}`;
      result.errors.push(errorMsg);
      log.error('Failed to send nudge', {
        error: String(err),
        email: session.email,
      });
    }
  }

  // ============================================
  // 2. INACTIVITY REMINDERS (F-13): 7 days
  // ============================================
  const inactiveTrials = await prisma.trialSession.findMany({
    where: {
      email: { not: null },
      lastActivityAt: { lt: sevenDaysAgo },
      chatsUsed: { gt: 0 }, // Only remind users who actually used the trial
    },
    select: {
      id: true,
      visitorId: true,
      email: true,
      lastActivityAt: true,
    },
  });

  log.info(`Found ${inactiveTrials.length} inactive trials to remind`);

  for (const session of inactiveTrials) {
    // Check if already sent reminder
    // Use string_contains for JSON field filtering (Prisma PostgreSQL)
    const alreadyReminded = await prisma.funnelEvent.findFirst({
      where: {
        visitorId: session.visitorId,
        metadata: {
          string_contains: '"inactivityReminder":true',
        },
      },
    });

    if (alreadyReminded) continue;

    try {
      const sendResult = await sendEmail({
        to: session.email!,
        subject: 'Ti manca MirrorBuddy! 🎓',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MirrorBuddy - Ti manca!</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">MirrorBuddy</h1>
  </div>

  <div style="background: #ffffff; padding: 32px 24px; margin: 0;">
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
      Ciao!
    </h2>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Non ti vediamo su MirrorBuddy da un po'. I tuoi maestri virtuali ti aspettano per continuare a imparare insieme!
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
        Torna su MirrorBuddy
      </a>
    </div>
  </div>

  <div style="background: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #64748b; font-size: 12px;">
      © 2026 MirrorBuddy
    </p>
  </div>
</body>
</html>
          `.trim(),
        text: `Ciao! Non ti vediamo su MirrorBuddy da un po'. I tuoi maestri virtuali ti aspettano per continuare a imparare insieme!\n\nTorna a trovarci: ${process.env.NEXT_PUBLIC_APP_URL}`,
      });

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Unknown email error');
      }

      await recordStageTransition({ visitorId: session.visitorId }, 'TRIAL_ENGAGED', {
        inactivityReminder: true,
        daysInactive: INACTIVITY_DAYS,
      });

      result.remindersSent++;
      log.info('Sent inactivity reminder', {
        visitorId: session.visitorId,
        email: session.email,
      });
    } catch (err) {
      const errorMsg = `Reminder to ${session.email}: ${err}`;
      result.errors.push(errorMsg);
      log.error('Failed to send reminder', {
        error: String(err),
        email: session.email,
      });
    }
  }

  if (result.errors.length > 0) {
    result.status = 'error';
  }

  log.info('Trial nurturing completed', {
    status: result.status,
    nudgesSent: result.nudgesSent,
    remindersSent: result.remindersSent,
    errorCount: result.errors.length,
  });
  return Response.json(result);
});

/**
 * Vercel Cron uses GET
 */
export const GET = POST;
