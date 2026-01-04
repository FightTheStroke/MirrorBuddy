/**
 * Gamification Database Operations
 * Handles persistence for points, achievements, streaks
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Season calculation
function getCurrentSeason(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

// Level calculation: 1000 MirrorBucks per level, max 100 per season
function calculateLevel(points: number): number {
  return Math.min(100, Math.floor(points / 1000) + 1);
}

// Tier based on level
function calculateTier(level: number): string {
  if (level >= 90) return 'leggenda';
  if (level >= 75) return 'maestro';
  if (level >= 60) return 'esperto';
  if (level >= 45) return 'avanzato';
  if (level >= 30) return 'intermedio';
  if (level >= 15) return 'apprendista';
  return 'principiante';
}

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
  let multiplier = 1.0;
  if (streak && streak.currentStreak >= 7) multiplier = 1.5;
  else if (streak && streak.currentStreak >= 3) multiplier = 1.25;
  else if (streak && streak.currentStreak >= 1) multiplier = 1.1;

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
  const unlockedAchievements: string[] = [];

  // Get all achievements not yet unlocked by user
  const allAchievements = await prisma.achievement.findMany();
  const userAchievementIds = gamification.achievements.map(ua => ua.achievementId);
  const lockedAchievements = allAchievements.filter(a => !userAchievementIds.includes(a.id));

  for (const achievement of lockedAchievements) {
    const requirement = JSON.parse(achievement.requirement);
    let shouldUnlock = false;

    // Check different achievement types
    switch (requirement.type) {
      case 'total_points':
        shouldUnlock = gamification.totalPoints >= requirement.value;
        break;
      case 'level':
        shouldUnlock = gamification.level >= requirement.value;
        break;
      case 'streak':
        shouldUnlock = (gamification.streak?.currentStreak || 0) >= requirement.value;
        break;
      case 'first_session':
        shouldUnlock = gamification.totalPoints > 0;
        break;
    }

    if (shouldUnlock) {
      await prisma.userAchievement.create({
        data: {
          gamificationId: gamification.id,
          achievementId: achievement.id,
          progress: 100,
        },
      });

      // Award bonus points for achievement
      if (achievement.points > 0) {
        await awardPoints(userId, achievement.points, 'achievement_bonus', achievement.id, 'Achievement');
      }

      unlockedAchievements.push(achievement.code);
      logger.info('Achievement unlocked', { userId, achievement: achievement.code });
    }
  }

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
