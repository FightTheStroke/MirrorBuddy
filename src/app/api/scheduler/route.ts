// ============================================================================
// SCHEDULER API
// Study scheduling with notifications for proactive learning (Issue #27)
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/scheduler/types";
import {
  createScheduleSessionData,
  createReminderData,
  updateSessionData,
  updateReminderData,
} from "./helpers";

// GET - Get user's study schedule
export const GET = pipe(
  withSentry("/api/scheduler"),
  withAuth,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `scheduler:${clientId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const userId = ctx.userId!;

  // Get or create schedule
  const schedule = await prisma.studySchedule.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      preferences: JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES),
    },
    include: {
      sessions: {
        where: { active: true },
        orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
      },
      reminders: {
        where: { active: true },
        orderBy: { datetime: "asc" },
      },
    },
  });

  // Parse preferences
  const preferences = JSON.parse(
    schedule.preferences || "{}",
  ) as NotificationPreferences;

  return NextResponse.json({
    id: schedule.id,
    userId: schedule.userId,
    weeklyPlan: schedule.sessions,
    customReminders: schedule.reminders,
    preferences,
    updatedAt: schedule.updatedAt,
  });
});

// POST - Create a new scheduled session or reminder
export const POST = pipe(
  withSentry("/api/scheduler"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `scheduler:${clientId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const userId = ctx.userId!;

  const body = await ctx.req.json();
  const { type, ...data } = body;

  // Ensure schedule exists
  const schedule = await prisma.studySchedule.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      preferences: JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES),
    },
  });

  if (type === "session") {
    // Create scheduled session
    const sessionData = createScheduleSessionData(data);
    const session = await prisma.scheduledSession.create({
      data: {
        userId,
        scheduleId: schedule.id,
        ...sessionData,
      },
    });

    logger.info("Created scheduled session", {
      userId,
      sessionId: session.id,
    });
    return NextResponse.json(session, { status: 201 });
  }

  if (type === "reminder") {
    // Create custom reminder
    const reminderData = createReminderData(data);
    const reminder = await prisma.customReminder.create({
      data: {
        userId,
        scheduleId: schedule.id,
        ...reminderData,
      },
    });

    logger.info("Created custom reminder", {
      userId,
      reminderId: reminder.id,
    });
    return NextResponse.json(reminder, { status: 201 });
  }

  return NextResponse.json(
    { error: 'Invalid type. Must be "session" or "reminder"' },
    { status: 400 },
  );
});

// PATCH - Update preferences or schedule item
export const PATCH = pipe(
  withSentry("/api/scheduler"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `scheduler:${clientId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const userId = ctx.userId!;

  const body = await ctx.req.json();
  const { type, id, ...data } = body;

  if (type === "preferences") {
    // Update notification preferences
    const schedule = await prisma.studySchedule.upsert({
      where: { userId },
      create: {
        userId,
        preferences: JSON.stringify({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...data,
        }),
      },
      update: {
        preferences: JSON.stringify(data),
      },
    });

    logger.info("Updated notification preferences", { userId });
    return NextResponse.json({
      preferences: JSON.parse(schedule.preferences || "{}"),
    });
  }

  if (type === "session" && id) {
    // Update session
    const sessionData = updateSessionData(data);
    const session = await prisma.scheduledSession.update({
      where: { id, userId },
      data: sessionData,
    });

    return NextResponse.json(session);
  }

  if (type === "reminder" && id) {
    // Update reminder
    const reminderData = updateReminderData(data);
    const reminder = await prisma.customReminder.update({
      where: { id, userId },
      data: reminderData,
    });

    return NextResponse.json(reminder);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
});

// DELETE - Delete a session or reminder
export const DELETE = pipe(
  withSentry("/api/scheduler"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `scheduler:${clientId}`,
    RATE_LIMITS.GENERAL,
  );

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 },
    );
  }

  if (type === "session") {
    await prisma.scheduledSession.delete({
      where: { id, userId },
    });
    logger.info("Deleted scheduled session", { userId, sessionId: id });
  } else if (type === "reminder") {
    await prisma.customReminder.delete({
      where: { id, userId },
    });
    logger.info("Deleted custom reminder", { userId, reminderId: id });
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
});
