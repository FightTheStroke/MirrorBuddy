/**
 * API Route: Gamification Points
 * POST /api/gamification/points - Award points
 * GET /api/gamification/points - Get points history
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { awardPoints, getOrCreateGamification, checkAchievements } from '@/lib/gamification/db';
import { logger } from '@/lib/logger';
import { validateJsonRequest } from '@/lib/validation/middleware';
import { AwardPointsRequestSchema } from '@/lib/validation/schemas/gamification';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gamification = await getOrCreateGamification(userId);

    // Get recent transactions
    const transactions = await prisma.pointsTransaction.findMany({
      where: { gamificationId: gamification.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      totalPoints: gamification.totalPoints,
      seasonPoints: gamification.seasonPoints,
      mirrorBucks: gamification.mirrorBucks,
      transactions: transactions.map(t => ({
        points: t.points,
        reason: t.reason,
        multiplier: t.multiplier,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to get points', { error: String(error) });
    return NextResponse.json({ error: 'Failed to get points' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const validation = await validateJsonRequest(request, AwardPointsRequestSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { points, reason, sourceId, sourceType } = validation.data;

    const result = await awardPoints(userId, points, reason, sourceId, sourceType);

    // Check for new achievements after awarding points
    const newAchievements = await checkAchievements(userId);

    return NextResponse.json({
      success: true,
      ...result,
      newAchievements,
    });
  } catch (error) {
    logger.error('Failed to award points', { error: String(error) });
    return NextResponse.json({ error: 'Failed to award points' }, { status: 500 });
  }
}
