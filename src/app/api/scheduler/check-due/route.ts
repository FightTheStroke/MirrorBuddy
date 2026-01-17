// ============================================================================
// CHECK DUE API
// Checks for due flashcards and upcoming sessions, creates notifications
// This endpoint is called periodically by the client (Issue #27)
// ============================================================================

import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/session-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/lib/scheduler/types';
import { sendPushToUser, isPushConfigured } from '@/lib/push/send';
import { parseTime, isQuietHours, getMelissaVoice } from './helpers';

// POST - Check for due items and create notifications
export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`scheduler-check:${clientId}`, {
    ...RATE_LIMITS.GENERAL,
    maxRequests: 30, // Allow more frequent checks
    windowMs: 60000, // Per minute
  });

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Get user's schedule and preferences
    const schedule = await prisma.studySchedule.findUnique({
      where: { userId },
      include: {
        sessions: { where: { active: true } },
        reminders: { where: { active: true } },
      },
    });

    const preferences: NotificationPreferences = schedule?.preferences
      ? JSON.parse(schedule.preferences)
      : DEFAULT_NOTIFICATION_PREFERENCES;

    // Skip if notifications disabled or quiet hours
    if (!preferences.enabled || isQuietHours(preferences)) {
      return NextResponse.json({
        checked: true,
        notificationsCreated: 0,
        reason: !preferences.enabled ? 'notifications_disabled' : 'quiet_hours',
      });
    }

    const now = new Date();
    const notificationsCreated: string[] = [];

    // 1. Check for due flashcards
    const dueFlashcards = await prisma.flashcardProgress.findMany({
      where: {
        userId,
        nextReview: { lte: now },
        state: { not: 'new' }, // Only cards that have been reviewed before
      },
    });

    if (dueFlashcards.length >= 3) {
      // Only notify if 3+ cards are due
      // Check if we already sent a flashcard notification recently
      const recentFlashcardNotif = await prisma.notification.findFirst({
        where: {
          userId,
          type: 'flashcard_due',
          createdAt: {
            gte: new Date(now.getTime() - preferences.minIntervalMinutes * 60 * 1000),
          },
        },
      });

      if (!recentFlashcardNotif) {
        const melissaVoice = getMelissaVoice('flashcard_due', { count: dueFlashcards.length });

        const flashcardTitle = 'Flashcard pronte!';
        const flashcardMessage = `Hai ${dueFlashcards.length} flashcard da ripassare.`;

        await prisma.notification.create({
          data: {
            userId,
            type: 'flashcard_due',
            title: flashcardTitle,
            message: flashcardMessage,
            actionUrl: '/flashcards',
            priority: 'medium',
            melissaVoice,
            sentAt: now,
            expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Expires in 24h
          },
        });

        // Send push notification (ADR-0014)
        if (isPushConfigured()) {
          await sendPushToUser(userId, {
            title: flashcardTitle,
            body: flashcardMessage,
            url: '/flashcards',
            tag: 'flashcard_due',
          });
        }

        notificationsCreated.push('flashcard_due');
        logger.info('Created flashcard due notification', { userId, count: dueFlashcards.length });
      }
    }

    // 2. Check for upcoming scheduled sessions
    const currentDayOfWeek = now.getDay();

    if (schedule?.sessions?.length) {
      // Batch fetch all recent session notifications to avoid N+1
      const sessionIds = schedule.sessions.map((s) => s.id);
      const recentSessionNotifs = await prisma.notification.findMany({
        where: {
          userId,
          type: 'scheduled_session',
          relatedId: { in: sessionIds },
          createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
        },
      });
      const notifiedSessionIds = new Set(recentSessionNotifs.map((n) => n.relatedId));

      // Prepare batch creates
      const sessionNotifsToCreate: Array<{
        session: (typeof schedule.sessions)[0];
        minutesUntil: number;
      }> = [];

      for (const session of schedule.sessions) {
        if (session.dayOfWeek !== currentDayOfWeek) continue;

        const sessionTime = parseTime(session.time);
        const sessionMinutes = sessionTime.hours * 60 + sessionTime.minutes;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const minutesUntil = sessionMinutes - nowMinutes;

        if (minutesUntil > 0 && minutesUntil <= session.reminderOffset) {
          if (!notifiedSessionIds.has(session.id)) {
            sessionNotifsToCreate.push({ session, minutesUntil });
          }
        }
      }

      // Batch create notifications and send pushes
      for (const { session, minutesUntil } of sessionNotifsToCreate) {
        const melissaVoice = getMelissaVoice('scheduled_session', {
          minutes: minutesUntil,
          subject: session.subject,
        });

        const sessionTitle = `Studio: ${session.subject}`;
        const sessionMessage = `Tra ${minutesUntil} minuti e' ora di studiare ${session.subject}!`;
        const sessionUrl = session.maestroId ? `/maestro/${session.maestroId}` : '/maestri';

        await prisma.notification.create({
          data: {
            userId,
            type: 'scheduled_session',
            title: sessionTitle,
            message: sessionMessage,
            actionUrl: sessionUrl,
            priority: 'high',
            relatedId: session.id,
            melissaVoice,
            sentAt: now,
            expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
          },
        });

        if (isPushConfigured()) {
          await sendPushToUser(userId, {
            title: sessionTitle,
            body: sessionMessage,
            url: sessionUrl,
            tag: `session_${session.id}`,
            requireInteraction: true,
          });
        }

        notificationsCreated.push('scheduled_session');
        logger.info('Created session reminder', { userId, sessionId: session.id, subject: session.subject });
      }
    }

    // 3. Check for custom reminders
    if (schedule?.reminders?.length) {
      // Batch fetch all recent reminder notifications to avoid N+1
      const reminderIds = schedule.reminders.map((r) => r.id);
      const recentReminderNotifs = await prisma.notification.findMany({
        where: {
          userId,
          type: 'reminder',
          relatedId: { in: reminderIds },
          createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
        },
      });
      const notifiedReminderIds = new Set(recentReminderNotifs.map((n) => n.relatedId));

      const remindersToDeactivate: string[] = [];

      for (const reminder of schedule.reminders) {
        const reminderTime = new Date(reminder.datetime);
        const diffMinutes = (reminderTime.getTime() - now.getTime()) / (60 * 1000);

        if (diffMinutes >= 0 && diffMinutes <= 5 && !notifiedReminderIds.has(reminder.id)) {
          const reminderTitle = 'Promemoria';
          const reminderUrl = reminder.maestroId ? `/maestro/${reminder.maestroId}` : '/';

          await prisma.notification.create({
            data: {
              userId,
              type: 'reminder',
              title: reminderTitle,
              message: reminder.message,
              actionUrl: reminderUrl,
              priority: 'medium',
              relatedId: reminder.id,
              sentAt: now,
              expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            },
          });

          if (isPushConfigured()) {
            await sendPushToUser(userId, {
              title: reminderTitle,
              body: reminder.message,
              url: reminderUrl,
              tag: `reminder_${reminder.id}`,
            });
          }

          notificationsCreated.push('custom_reminder');

          if (reminder.repeat === 'none') {
            remindersToDeactivate.push(reminder.id);
          }

          logger.info('Created custom reminder notification', { userId, reminderId: reminder.id });
        }
      }

      // Batch update non-repeating reminders
      if (remindersToDeactivate.length > 0) {
        await prisma.customReminder.updateMany({
          where: { id: { in: remindersToDeactivate } },
          data: { active: false },
        });
      }
    }

    // 4. Check streak at risk
    const progress = await prisma.progress.findUnique({
      where: { userId },
    });

    if (progress && progress.streakCurrent > 0) {
      const lastStudy = progress.lastStudyDate;
      const streakTime = parseTime(preferences.streakWarningTime);
      const isStreakWarningTime =
        now.getHours() === streakTime.hours &&
        now.getMinutes() >= streakTime.minutes &&
        now.getMinutes() < streakTime.minutes + 30;

      if (lastStudy && isStreakWarningTime) {
        const lastStudyDate = new Date(lastStudy);
        const isToday =
          lastStudyDate.getDate() === now.getDate() &&
          lastStudyDate.getMonth() === now.getMonth() &&
          lastStudyDate.getFullYear() === now.getFullYear();

        if (!isToday) {
          // No study today - streak at risk!
          const recentStreakNotif = await prisma.notification.findFirst({
            where: {
              userId,
              type: 'streak',
              createdAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) }, // Within 4 hours
            },
          });

          if (!recentStreakNotif) {
            const melissaVoice = getMelissaVoice('streak_warning', { days: progress.streakCurrent });

            const streakTitle = 'Streak a rischio!';
            const streakMessage = `La tua streak di ${progress.streakCurrent} giorni sta per finire!`;

            await prisma.notification.create({
              data: {
                userId,
                type: 'streak',
                title: streakTitle,
                message: streakMessage,
                actionUrl: '/maestri',
                priority: 'high',
                melissaVoice,
                sentAt: now,
                expiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000), // Expires in 3h
              },
            });

            // Send push notification (ADR-0014)
            if (isPushConfigured()) {
              await sendPushToUser(userId, {
                title: streakTitle,
                body: streakMessage,
                url: '/maestri',
                tag: 'streak_warning',
                requireInteraction: true, // High priority - keep visible
              });
            }

            notificationsCreated.push('streak_warning');
            logger.info('Created streak warning', { userId, streak: progress.streakCurrent });
          }
        }
      }
    }

    return NextResponse.json({
      checked: true,
      notificationsCreated: notificationsCreated.length,
      types: notificationsCreated,
    });
  } catch (error) {
    logger.error('Check due error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to check due items' }, { status: 500 });
  }
}
