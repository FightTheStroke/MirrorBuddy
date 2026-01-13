/**
 * CHECK DUE API
 * Checks for due flashcards and upcoming sessions, creates notifications
 * This endpoint is called periodically by the client (Issue #27)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { type NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/scheduler/types';
import { sendPushToUser, isPushConfigured } from '@/lib/push/send';
import { getUserId, parseTime, isQuietHours, getMelissaVoice } from './helpers';

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`scheduler-check:${clientId}`, {
    ...RATE_LIMITS.GENERAL,
    maxRequests: 30,
    windowMs: 60000,
  });

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

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

    if (!preferences.enabled || isQuietHours(preferences)) {
      return NextResponse.json({
        checked: true,
        notificationsCreated: 0,
        reason: !preferences.enabled ? 'notifications_disabled' : 'quiet_hours',
      });
    }

    const now = new Date();
    const notificationsCreated: string[] = [];

    // Check for due flashcards
    const dueFlashcards = await prisma.flashcardProgress.findMany({
      where: {
        userId,
        nextReview: { lte: now },
        state: { not: 'new' },
      },
    });

    if (dueFlashcards.length >= 3) {
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
            expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        });

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

    // Check for upcoming scheduled sessions
    const currentDayOfWeek = now.getDay();

    if (schedule?.sessions) {
      for (const session of schedule.sessions) {
        if (session.dayOfWeek !== currentDayOfWeek) continue;

        const sessionTime = parseTime(session.time);
        const sessionMinutes = sessionTime.hours * 60 + sessionTime.minutes;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const minutesUntil = sessionMinutes - nowMinutes;

        if (minutesUntil > 0 && minutesUntil <= session.reminderOffset) {
          const recentSessionNotif = await prisma.notification.findFirst({
            where: {
              userId,
              type: 'scheduled_session',
              relatedId: session.id,
              createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
            },
          });

          if (!recentSessionNotif) {
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
      }
    }

    // Check for custom reminders
    if (schedule?.reminders) {
      for (const reminder of schedule.reminders) {
        const reminderTime = new Date(reminder.datetime);
        const diffMinutes = (reminderTime.getTime() - now.getTime()) / (60 * 1000);

        if (diffMinutes >= 0 && diffMinutes <= 5) {
          const recentReminderNotif = await prisma.notification.findFirst({
            where: {
              userId,
              type: 'reminder',
              relatedId: reminder.id,
              createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
            },
          });

          if (!recentReminderNotif) {
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
              await prisma.customReminder.update({
                where: { id: reminder.id },
                data: { active: false },
              });
            }

            logger.info('Created custom reminder notification', { userId, reminderId: reminder.id });
          }
        }
      }
    }

    // Check streak at risk
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
          const recentStreakNotif = await prisma.notification.findFirst({
            where: {
              userId,
              type: 'streak',
              createdAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
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
                expiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
              },
            });

            if (isPushConfigured()) {
              await sendPushToUser(userId, {
                title: streakTitle,
                body: streakMessage,
                url: '/maestri',
                tag: 'streak_warning',
                requireInteraction: true,
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
