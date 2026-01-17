/**
 * API Route: Gamification Streak
 * GET /api/gamification/streak - Get current streak
 * POST /api/gamification/streak - Update streak with activity
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { getOrCreateGamification, updateStreak } from "@/lib/gamification/db";
import { logger } from "@/lib/logger";
import { validateJsonRequest } from "@/lib/validation/middleware";
import { UpdateStreakRequestSchema } from "@/lib/validation/schemas/gamification";
import { requireCSRF } from "@/lib/security/csrf";

export async function GET() {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const gamification = await getOrCreateGamification(userId);
    const streak = gamification.streak;

    return NextResponse.json({
      success: true,
      streak: streak
        ? {
            current: streak.currentStreak,
            longest: streak.longestStreak,
            lastActivity: streak.lastActivityAt,
            todayMinutes: streak.todayMinutes,
            goalMinutes: streak.dailyGoalMinutes,
            goalMet: streak.goalMetToday,
          }
        : null,
    });
  } catch (error) {
    logger.error("Failed to get streak", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get streak" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Validate request body
    const validation = await validateJsonRequest(
      request,
      UpdateStreakRequestSchema,
    );
    if (!validation.success) {
      return validation.response;
    }

    const { minutes: minutesStudied } = validation.data;

    const updated = await updateStreak(userId, minutesStudied);

    return NextResponse.json({
      success: true,
      streak: updated
        ? {
            current: updated.currentStreak,
            longest: updated.longestStreak,
            todayMinutes: updated.todayMinutes,
            goalMet: updated.goalMetToday,
          }
        : null,
    });
  } catch (error) {
    logger.error("Failed to update streak", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to update streak" },
      { status: 500 },
    );
  }
}
