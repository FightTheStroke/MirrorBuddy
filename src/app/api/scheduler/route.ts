// ============================================================================
// SCHEDULER API
// Study scheduling with notifications for proactive learning (Issue #27)
// ============================================================================

import { NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/session-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '@/lib/scheduler/types';

// GET - Get user's study schedule
export async function GET(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`scheduler:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Get or create schedule
    let schedule = await prisma.studySchedule.findUnique({
      where: { userId },
      include: {
        sessions: {
          where: { active: true },
          orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
        },
        reminders: {
          where: { active: true },
          orderBy: { datetime: 'asc' },
        },
      },
    });

    if (!schedule) {
      // Create default schedule
      schedule = await prisma.studySchedule.create({
        data: {
          userId,
          preferences: JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES),
        },
        include: {
          sessions: true,
          reminders: true,
        },
      });
    }

    // Parse preferences
    const preferences = JSON.parse(schedule.preferences || '{}') as NotificationPreferences;

    return NextResponse.json({
      id: schedule.id,
      userId: schedule.userId,
      weeklyPlan: schedule.sessions,
      customReminders: schedule.reminders,
      preferences,
      updatedAt: schedule.updatedAt,
    });
  } catch (error) {
    logger.error('Scheduler GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to get schedule' }, { status: 500 });
  }
}

// POST - Create a new scheduled session or reminder
export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`scheduler:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();
    const { type, ...data } = body;

    // Ensure schedule exists
    let schedule = await prisma.studySchedule.findUnique({
      where: { userId },
    });

    if (!schedule) {
      schedule = await prisma.studySchedule.create({
        data: {
          userId,
          preferences: JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES),
        },
      });
    }

    if (type === 'session') {
      // Create scheduled session
      const session = await prisma.scheduledSession.create({
        data: {
          userId,
          scheduleId: schedule.id,
          dayOfWeek: data.dayOfWeek,
          time: data.time,
          duration: data.duration || 30,
          subject: data.subject,
          maestroId: data.maestroId,
          topic: data.topic,
          active: true,
          reminderOffset: data.reminderOffset || 5,
          repeat: data.repeat || 'weekly',
        },
      });

      logger.info('Created scheduled session', { userId, sessionId: session.id });
      return NextResponse.json(session, { status: 201 });
    }

    if (type === 'reminder') {
      // Create custom reminder
      const reminder = await prisma.customReminder.create({
        data: {
          userId,
          scheduleId: schedule.id,
          datetime: new Date(data.datetime),
          message: data.message,
          subject: data.subject,
          maestroId: data.maestroId,
          repeat: data.repeat || 'none',
          active: true,
        },
      });

      logger.info('Created custom reminder', { userId, reminderId: reminder.id });
      return NextResponse.json(reminder, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid type. Must be "session" or "reminder"' }, { status: 400 });
  } catch (error) {
    logger.error('Scheduler POST error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create schedule item' }, { status: 500 });
  }
}

// PATCH - Update preferences or schedule item
export async function PATCH(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`scheduler:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();
    const { type, id, ...data } = body;

    if (type === 'preferences') {
      // Update notification preferences
      const schedule = await prisma.studySchedule.upsert({
        where: { userId },
        create: {
          userId,
          preferences: JSON.stringify({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...data }),
        },
        update: {
          preferences: JSON.stringify(data),
        },
      });

      logger.info('Updated notification preferences', { userId });
      return NextResponse.json({
        preferences: JSON.parse(schedule.preferences || '{}'),
      });
    }

    if (type === 'session' && id) {
      // Update session
      const session = await prisma.scheduledSession.update({
        where: { id, userId },
        data: {
          dayOfWeek: data.dayOfWeek,
          time: data.time,
          duration: data.duration,
          subject: data.subject,
          maestroId: data.maestroId,
          topic: data.topic,
          active: data.active,
          reminderOffset: data.reminderOffset,
          repeat: data.repeat,
        },
      });

      return NextResponse.json(session);
    }

    if (type === 'reminder' && id) {
      // Update reminder
      const reminder = await prisma.customReminder.update({
        where: { id, userId },
        data: {
          datetime: data.datetime ? new Date(data.datetime) : undefined,
          message: data.message,
          subject: data.subject,
          maestroId: data.maestroId,
          repeat: data.repeat,
          active: data.active,
        },
      });

      return NextResponse.json(reminder);
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    logger.error('Scheduler PATCH error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE - Delete a session or reminder
export async function DELETE(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`scheduler:${clientId}`, RATE_LIMITS.GENERAL);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'type and id are required' },
        { status: 400 }
      );
    }

    if (type === 'session') {
      await prisma.scheduledSession.delete({
        where: { id, userId },
      });
      logger.info('Deleted scheduled session', { userId, sessionId: id });
    } else if (type === 'reminder') {
      await prisma.customReminder.delete({
        where: { id, userId },
      });
      logger.info('Deleted custom reminder', { userId, reminderId: id });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Scheduler DELETE error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
