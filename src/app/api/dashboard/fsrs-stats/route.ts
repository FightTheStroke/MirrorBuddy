// ============================================================================
// API ROUTE: FSRS Statistics
// GET: Flashcard spaced repetition stats for dashboard
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/dashboard/fsrs-stats"),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const userId = ctx.userId!;

  // F-06: Get flashcard review data - FILTERED BY USER AND EXCLUDE TEST DATA
  const [totalCards, reviews, cardsByState] = await Promise.all([
    // Total flashcards for this user (exclude test data)
    prisma.flashcardProgress.count({
      where: { userId, isTestData: false },
    }),

    // Reviews in period for this user from telemetry (F-06: exclude test data)
    prisma.telemetryEvent.findMany({
      where: {
        userId,
        category: "flashcard",
        action: "review",
        timestamp: { gte: startDate },
        isTestData: false,
      },
      select: {
        value: true,
        timestamp: true,
        metadata: true,
      },
    }),

    // Cards by state for this user (exclude test data)
    prisma.flashcardProgress.groupBy({
      by: ["state"],
      where: { userId, isTestData: false },
      _count: { _all: true },
    }),
  ]);

  // Calculate review stats
  const totalReviews = reviews.length;
  let correctReviews = 0;
  let totalDifficulty = 0;

  for (const review of reviews) {
    // value > 2 means correct (Good or Easy rating)
    if ((review.value || 0) > 2) {
      correctReviews++;
    }
    totalDifficulty += review.value || 0;
  }

  const accuracy =
    totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;
  const avgDifficulty =
    totalReviews > 0
      ? Math.round((totalDifficulty / totalReviews) * 10) / 10
      : 0;

  // State distribution
  const stateDistribution: Record<string, number> = {};
  for (const state of cardsByState) {
    stateDistribution[state.state] = state._count._all ?? 0;
  }

  // Daily reviews
  const dailyReviews: Record<string, number> = {};
  for (const review of reviews) {
    const day = review.timestamp.toISOString().split("T")[0];
    dailyReviews[day] = (dailyReviews[day] || 0) + 1;
  }

  // F-06: Cards due today for this user (exclude test data)
  const now = new Date();
  const cardsDueToday = await prisma.flashcardProgress.count({
    where: {
      userId,
      nextReview: { lte: now },
      isTestData: false,
    },
  });

  return NextResponse.json({
    period: { days, startDate: startDate.toISOString() },
    summary: {
      totalCards,
      totalReviews,
      correctReviews,
      accuracy,
      avgDifficulty,
      cardsDueToday,
    },
    stateDistribution,
    dailyReviews,
  });
});
