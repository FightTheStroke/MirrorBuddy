// ============================================================================
// API ROUTE: FSRS Statistics
// GET: Flashcard spaced repetition stats for dashboard
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/dashboard/fsrs-stats'),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = parseInt(searchParams.get('days') ?? '7', 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Admin dashboard: system-wide stats (not filtered by admin's own userId)
  // F-06: Exclude test data via isTestData flag
  const [totalCards, reviews, cardsByState] = await Promise.all([
    // Total flashcards across all users (exclude test data)
    prisma.flashcardProgress.count({
      where: { isTestData: false },
    }),

    // Reviews in period from telemetry (F-06: exclude test data)
    prisma.telemetryEvent.findMany({
      where: {
        category: 'flashcard',
        action: 'review',
        timestamp: { gte: startDate },
        isTestData: false,
      },
      select: {
        value: true,
        timestamp: true,
        metadata: true,
      },
    }),

    // Cards by state across all users (exclude test data)
    prisma.flashcardProgress.groupBy({
      by: ['state'],
      where: { isTestData: false },
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

  const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;
  const avgDifficulty =
    totalReviews > 0 ? Math.round((totalDifficulty / totalReviews) * 10) / 10 : 0;

  // State distribution
  const stateDistribution: Record<string, number> = {};
  for (const state of cardsByState) {
    stateDistribution[state.state] = state._count._all ?? 0;
  }

  // Daily reviews
  const dailyReviews: Record<string, number> = {};
  for (const review of reviews) {
    const day = review.timestamp.toISOString().split('T')[0];
    dailyReviews[day] = (dailyReviews[day] || 0) + 1;
  }

  // F-06: Cards due today system-wide (exclude test data)
  const now = new Date();
  const cardsDueToday = await prisma.flashcardProgress.count({
    where: {
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
