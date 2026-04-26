/**
 * API Route: Gamification Streak
 * GET /api/gamification/streak - Get current streak
 * POST /api/gamification/streak - Update streak with activity
 */

import { NextResponse } from "next/server";
import { getOrCreateGamification, updateStreak } from "@/lib/gamification/db";
import { validateJsonRequest } from "@/lib/validation/middleware";
import { UpdateStreakRequestSchema } from "@/lib/validation/schemas/gamification";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/gamification/streak"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

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
});

export const POST = pipe(
  withSentry("/api/gamification/streak"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Validate request body
  const validation = await validateJsonRequest(
    ctx.req,
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
});
