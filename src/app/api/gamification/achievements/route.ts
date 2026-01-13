/**
 * API Route: Gamification Achievements
 * GET /api/gamification/achievements - Get user achievements
 * WAVE 3: Added caching for achievement definitions
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getOrCreateGamification, checkAchievements } from '@/lib/gamification/db';
import { logger } from '@/lib/logger';
import { getOrCompute, CACHE_TTL, getCacheControlHeader } from '@/lib/cache';

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

    // Get all achievements with unlock status (cached - static data)
    const allAchievements = await getOrCompute(
      'achievements:definitions',
      () =>
        prisma.achievement.findMany({
          orderBy: [{ category: 'asc' }, { tier: 'asc' }],
        }),
      { ttl: CACHE_TTL.ACHIEVEMENTS }
    );

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

    const response = NextResponse.json({
      success: true,
      achievements: visibleAchievements,
      totalUnlocked: achievements.filter(a => a.unlocked).length,
      totalAchievements: allAchievements.length,
    });

    // Add Cache-Control header with stale-while-revalidate
    // Using shorter stale-while-revalidate for user-specific achievement data
    response.headers.set(
      'Cache-Control',
      getCacheControlHeader({
        ttl: 60000, // 1 minute cache
        visibility: 'private', // User-specific data
        staleWhileRevalidate: 60000, // 1 minute stale-while-revalidate to limit outdated unlock statuses
      })
    );

    return response;
  } catch (error) {
    logger.error('Failed to get achievements', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get achievements' },
      { status: 500 }
    );
  }
}
