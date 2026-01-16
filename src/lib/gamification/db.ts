/**
 * Gamification Database Operations
 * Handles persistence for points, achievements, streaks
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  getCurrentSeason,
  calculateLevel,
  calculateTier,
  calculateStreakMultiplier,
  checkAchievementRequirement,
} from './gamification-helpers';

/**
 * Get or create user gamification record
 */
export async function getOrCreateGamification(userId: string) {
  let gamification = await prisma.userGamification.findUnique({
    where: { userId },
    include: {
      streak: true,
      achievements: { include: { achievement: true } },
    },
  });

  if (!gamification) {
    const currentSeason = getCurrentSeason();
    gamification = await prisma.userGamification.create({
      data: {
        userId,
        currentSeason,
        seasonStartDate: new Date(),
      },
      include: {
        streak: true,
        achievements: { include: { achievement: true } },
      },
    });

    // Create streak record
    await prisma.dailyStreak.create({
      data: { gamificationId: gamification.id },
    });

    // Refetch with streak
    gamification = await prisma.userGamification.findUnique({
      where: { userId },
      include: {
        streak: true,
        achievements: { include: { achievement: true } },
      },
    });
  }

  return gamification!;
}

/**
 * Award points to user
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  sourceId?: string,
  sourceType?: string
) {
  const gamification = await getOrCreateGamification(userId);
  const streak = gamification.streak;

  // Calculate multiplier based on streak
  const multiplier = streak ? calculateStreakMultiplier(streak.currentStreak) : 1.0;

  const finalPoints = Math.round(points * multiplier);
  const newTotal = gamification.totalPoints + finalPoints;
  const newSeason = gamification.seasonPoints + finalPoints;
  const newMirrorBucks = gamification.mirrorBucks + finalPoints;
  const newLevel = calculateLevel(newSeason);
  const newTier = calculateTier(newLevel);

  // Update gamification
  await prisma.userGamification.update({
    where: { id: gamification.id },
    data: {
      totalPoints: newTotal,
      seasonPoints: newSeason,
      mirrorBucks: newMirrorBucks,
      level: newLevel,
      tier: newTier,
    },
  });

  // Record transaction
  await prisma.pointsTransaction.create({
    data: {
      gamificationId: gamification.id,
      points: finalPoints,
      reason,
      sourceId,
      sourceType,
      multiplier,
    },
  });

  logger.info('Points awarded', { userId, points: finalPoints, reason, newTotal });

  return {
    pointsAwarded: finalPoints,
    multiplier,
    totalPoints: newTotal,
    seasonPoints: newSeason,
    mirrorBucks: newMirrorBucks,
    level: newLevel,
    tier: newTier,
    leveledUp: newLevel > gamification.level,
  };
}

/**
 * Update daily streak
 */
export async function updateStreak(userId: string, minutesStudied: number) {
  const gamification = await getOrCreateGamification(userId);

  if (!gamification.streak) {
    await prisma.dailyStreak.create({
      data: { gamificationId: gamification.id },
    });
  }

  const streak = await prisma.dailyStreak.findUnique({
    where: { gamificationId: gamification.id },
  });

  if (!streak) return null;

  const now = new Date();
  const lastActivity = new Date(streak.lastActivityAt);
  const isNewDay = now.toDateString() !== lastActivity.toDateString();
  const daysSinceLastActivity = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );

  let newCurrentStreak = streak.currentStreak;
  let newTodayMinutes: number;

  if (isNewDay) {
    if (daysSinceLastActivity === 1) {
      // Consecutive day
      newCurrentStreak = streak.currentStreak + 1;
    } else if (daysSinceLastActivity > 1) {
      // Streak broken
      newCurrentStreak = 1;
    }
    newTodayMinutes = minutesStudied;
  } else {
    newTodayMinutes = streak.todayMinutes + minutesStudied;
  }

  const goalMet = newTodayMinutes >= streak.dailyGoalMinutes;
  const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

  const updated = await prisma.dailyStreak.update({
    where: { id: streak.id },
    data: {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastActivityAt: now,
      todayMinutes: newTodayMinutes,
      goalMetToday: goalMet,
    },
  });

  return updated;
}

/**
 * Check and unlock achievements
 */
export async function checkAchievements(userId: string) {
  const gamification = await getOrCreateGamification(userId);

  // Get all achievements not yet unlocked by user
  const allAchievements = await prisma.achievement.findMany();
  const userAchievementIds = new Set(gamification.achievements.map(ua => ua.achievementId));
  const lockedAchievements = allAchievements.filter(a => !userAchievementIds.has(a.id));

  // Collect achievements to unlock (single pass check)
  const toUnlock: Array<{ achievement: typeof allAchievements[0] }> = [];
  for (const achievement of lockedAchievements) {
    const requirement = JSON.parse(achievement.requirement);
    const shouldUnlock = checkAchievementRequirement(requirement, {
      totalPoints: gamification.totalPoints,
      level: gamification.level,
      currentStreak: gamification.streak?.currentStreak || 0,
    });
    if (shouldUnlock) {
      toUnlock.push({ achievement });
    }
  }

  if (toUnlock.length === 0) {
    return [];
  }

  // Batch create all userAchievements in a single transaction (N+1 fix)
  await prisma.$transaction(
    toUnlock.map(({ achievement }) =>
      prisma.userAchievement.create({
        data: {
          gamificationId: gamification.id,
          achievementId: achievement.id,
          progress: 100,
        },
      })
    )
  );

  // Calculate total bonus points and award once (avoid N calls to awardPoints)
  const totalBonusPoints = toUnlock.reduce((sum, { achievement }) => sum + achievement.points, 0);
  if (totalBonusPoints > 0) {
    const achievementIds = toUnlock.map(({ achievement }) => achievement.id).join(',');
    await awardPoints(userId, totalBonusPoints, 'achievement_bonus', achievementIds, 'Achievement');
  }

  const unlockedAchievements = toUnlock.map(({ achievement }) => achievement.code);
  logger.info('Achievements unlocked', { userId, achievements: unlockedAchievements, bonusPoints: totalBonusPoints });

  return unlockedAchievements;
}

/**
 * Get user's progression data
 */
export async function getProgression(userId: string) {
  const gamification = await getOrCreateGamification(userId);

  const pointsToNextLevel = (gamification.level * 1000) - gamification.seasonPoints;
  const progressPercent = Math.round(
    ((gamification.seasonPoints % 1000) / 1000) * 100
  );

  return {
    level: gamification.level,
    tier: gamification.tier,
    totalPoints: gamification.totalPoints,
    seasonPoints: gamification.seasonPoints,
    mirrorBucks: gamification.mirrorBucks,
    currentSeason: gamification.currentSeason,
    pointsToNextLevel: Math.max(0, pointsToNextLevel),
    progressPercent,
    streak: gamification.streak ? {
      current: gamification.streak.currentStreak,
      longest: gamification.streak.longestStreak,
      todayMinutes: gamification.streak.todayMinutes,
      goalMinutes: gamification.streak.dailyGoalMinutes,
      goalMet: gamification.streak.goalMetToday,
    } : null,
  };
}
