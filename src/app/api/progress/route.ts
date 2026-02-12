// ============================================================================
// API ROUTE: User progress (gamification)
// GET: Get current progress
// PUT: Update progress
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/tracing';
import { serverNotifications } from '@/lib/notifications/server-triggers';
import { ProgressUpdateSchema } from '@/lib/validation/schemas/progress';
import { pipe, withSentry, withAuth, withCSRF } from '@/lib/api/middlewares';
import { safeReadJson } from '@/lib/api/safe-json';

export const GET = pipe(
  withSentry('/api/progress'),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Prisma upsert can still race under concurrent requests in some environments.
  // Handle P2002 by falling back to a read after the conflicting create.
  const progress = await (async () => {
    try {
      return await prisma.progress.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    } catch (error) {
      const isPrismaP2002 =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: unknown }).code === 'P2002';
      if (!isPrismaP2002) {
        throw error;
      }
      const existing = await prisma.progress.findUnique({ where: { userId } });
      if (existing) return existing;
      // Extremely unlikely: retry create if record still not visible.
      return await prisma.progress.create({ data: { userId } });
    }
  })();

  // Parse JSON fields and add season data
  const response = NextResponse.json({
    ...progress,
    mirrorBucks: progress.xp ?? 0, // Map xp to mirrorBucks for backward compatibility
    seasonMirrorBucks: progress.seasonMirrorBucks ?? 0,
    seasonLevel: progress.seasonLevel ?? 1,
    allTimeLevel: progress.allTimeLevel ?? progress.level ?? 1,
    currentSeason: progress.currentSeason ? JSON.parse(progress.currentSeason) : null,
    seasonHistory: progress.seasonHistory ? JSON.parse(progress.seasonHistory) : [],
    achievements: JSON.parse(progress.achievements || '[]'),
    masteries: JSON.parse(progress.masteries || '[]'),
    streak: {
      current: progress.streakCurrent,
      longest: progress.streakLongest,
      lastStudyDate: progress.lastStudyDate,
    },
  });
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});

export const PUT = pipe(
  withSentry('/api/progress'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await safeReadJson(ctx.req);
  if (!body) {
    const response = NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    response.headers.set('X-Request-ID', getRequestId(ctx.req));
    return response;
  }

  // #92: Validate with Zod before processing
  const validation = ProgressUpdateSchema.safeParse(body);
  if (!validation.success) {
    const response = NextResponse.json(
      {
        error: 'Invalid progress data',
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
    response.headers.set('X-Request-ID', getRequestId(ctx.req));
    return response;
  }

  const data = validation.data;

  // Get current progress for comparison (to detect level ups, streak milestones)
  const currentProgress = await prisma.progress.findUnique({
    where: { userId },
  });

  const oldLevel = currentProgress?.level ?? 1;
  const oldStreak = currentProgress?.streakCurrent ?? 0;
  const oldAchievements = currentProgress?.achievements
    ? JSON.parse(currentProgress.achievements)
    : [];

  // Map from frontend format to database format
  const updateData: Record<string, unknown> = {};

  // MirrorBucks system (xp is backward compatibility alias)
  if (data.mirrorBucks !== undefined) {
    updateData.xp = data.mirrorBucks;
  } else if (data.xp !== undefined) {
    updateData.xp = data.xp;
  }

  if (data.level !== undefined) updateData.level = data.level;
  if (data.seasonMirrorBucks !== undefined) updateData.seasonMirrorBucks = data.seasonMirrorBucks;
  if (data.seasonLevel !== undefined) updateData.seasonLevel = data.seasonLevel;
  if (data.allTimeLevel !== undefined) updateData.allTimeLevel = data.allTimeLevel;

  // Season data as JSON
  if (data.currentSeason !== undefined) {
    updateData.currentSeason = JSON.stringify(data.currentSeason);
  }
  if (data.seasonHistory !== undefined) {
    updateData.seasonHistory = JSON.stringify(data.seasonHistory);
  }

  // Other fields
  if (data.totalStudyMinutes !== undefined) updateData.totalStudyMinutes = data.totalStudyMinutes;
  if (data.questionsAsked !== undefined) updateData.questionsAsked = data.questionsAsked;
  if (data.sessionsThisWeek !== undefined) updateData.sessionsThisWeek = data.sessionsThisWeek;

  // Handle streak object
  if (data.streak) {
    if (data.streak.current !== undefined) updateData.streakCurrent = data.streak.current;
    if (data.streak.longest !== undefined) updateData.streakLongest = data.streak.longest;
    if (data.streak.lastStudyDate !== undefined) {
      updateData.lastStudyDate = new Date(data.streak.lastStudyDate);
    }
  }

  // Handle JSON arrays
  if (data.achievements !== undefined) {
    updateData.achievements = JSON.stringify(data.achievements);
  }
  if (data.masteries !== undefined) {
    updateData.masteries = JSON.stringify(data.masteries);
  }

  const progress = await prisma.progress.upsert({
    where: { userId },
    update: updateData,
    create: { userId, ...updateData },
  });

  // --- Trigger notifications for progress milestones ---

  // Level up notification
  const newLevel = data.level ?? oldLevel;
  if (newLevel > oldLevel) {
    serverNotifications.levelUp(userId, newLevel).catch((err) => {
      logger.error('Failed to send level up notification', {
        error: String(err),
      });
    });
  }

  // Streak milestone notification
  const newStreak = data.streak?.current ?? oldStreak;
  if (newStreak > oldStreak) {
    serverNotifications.streakMilestone(userId, newStreak).catch((err) => {
      logger.error('Failed to send streak notification', {
        error: String(err),
      });
    });
  }

  // New achievement notification
  if (data.achievements && Array.isArray(data.achievements)) {
    const oldAchievementIds = new Set(oldAchievements.map((a: { id: string }) => a.id));
    const newAchievements = data.achievements.filter((a) => !oldAchievementIds.has(a.id));

    for (const achievement of newAchievements) {
      serverNotifications
        .achievement(userId, achievement.id, achievement.name, achievement.description || '')
        .catch((err) => {
          logger.error('Failed to send achievement notification', {
            error: String(err),
          });
        });
    }
  }

  const response = NextResponse.json({
    ...progress,
    mirrorBucks: progress.xp ?? 0,
    seasonMirrorBucks: progress.seasonMirrorBucks ?? 0,
    seasonLevel: progress.seasonLevel ?? 1,
    allTimeLevel: progress.allTimeLevel ?? progress.level ?? 1,
    currentSeason: progress.currentSeason ? JSON.parse(progress.currentSeason) : null,
    seasonHistory: progress.seasonHistory ? JSON.parse(progress.seasonHistory) : [],
    achievements: JSON.parse(progress.achievements || '[]'),
    masteries: JSON.parse(progress.masteries || '[]'),
    streak: {
      current: progress.streakCurrent,
      longest: progress.streakLongest,
      lastStudyDate: progress.lastStudyDate,
    },
  });
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});
