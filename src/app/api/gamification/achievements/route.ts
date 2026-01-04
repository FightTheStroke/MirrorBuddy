/**
 * API Route: Gamification Achievements
 * GET /api/gamification/achievements - Get user achievements
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getOrCreateGamification, checkAchievements } from '@/lib/gamification/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for any new achievements first
    await checkAchievements(userId);

    const gamification = await getOrCreateGamification(userId);

    // Get all achievements with unlock status
    const allAchievements = await prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { tier: 'asc' }],
    });

    const userAchievementMap = new Map(
      gamification.achievements.map(ua => [ua.achievementId, ua])
    );

    const achievements = allAchievements.map(a => {
      const userAchievement = userAchievementMap.get(a.id);
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        description: a.description,
        category: a.category,
        icon: a.icon,
        tier: a.tier,
        points: a.points,
        isSecret: a.isSecret,
        unlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlockedAt || null,
        progress: userAchievement?.progress || 0,
      };
    });

    // Filter secret achievements that aren't unlocked
    const visibleAchievements = achievements.filter(
      a => !a.isSecret || a.unlocked
    );

    return NextResponse.json({
      success: true,
      achievements: visibleAchievements,
      totalUnlocked: achievements.filter(a => a.unlocked).length,
      totalAchievements: allAchievements.length,
    });
  } catch (error) {
    logger.error('Failed to get achievements', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get achievements' },
      { status: 500 }
    );
  }
}
