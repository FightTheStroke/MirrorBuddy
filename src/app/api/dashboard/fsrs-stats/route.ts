// ============================================================================
// API ROUTE: FSRS Statistics
// GET: Flashcard spaced repetition stats for dashboard
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/session-auth';

export async function GET(request: Request) {
  try {
    // Require authentication for admin dashboard
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '7', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const userId = auth.userId;

    // Get flashcard review data - FILTERED BY USER
    const [totalCards, reviews, cardsByState] = await Promise.all([
      // Total flashcards for this user
      prisma.flashcardProgress.count({
        where: { userId },
      }),

      // Reviews in period for this user (from telemetry)
      prisma.telemetryEvent.findMany({
        where: {
          userId,
          category: 'flashcard',
          action: 'review',
          timestamp: { gte: startDate },
        },
        select: {
          value: true,
          timestamp: true,
          metadata: true,
        },
      }),

      // Cards by state for this user
      prisma.flashcardProgress.groupBy({
        by: ['state'],
        where: { userId },
        _count: true,
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
    const avgDifficulty = totalReviews > 0 ? Math.round((totalDifficulty / totalReviews) * 10) / 10 : 0;

    // State distribution
    const stateDistribution: Record<string, number> = {};
    for (const state of cardsByState) {
      stateDistribution[state.state] = state._count;
    }

    // Daily reviews
    const dailyReviews: Record<string, number> = {};
    for (const review of reviews) {
      const day = review.timestamp.toISOString().split('T')[0];
      dailyReviews[day] = (dailyReviews[day] || 0) + 1;
    }

    // Cards due today
    const now = new Date();
    const cardsDueToday = await prisma.flashcardProgress.count({
      where: {
        nextReview: { lte: now },
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
  } catch (error) {
    logger.error('Dashboard fsrs-stats error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch FSRS stats' },
      { status: 500 }
    );
  }
}
