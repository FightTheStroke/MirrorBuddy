/**
 * Progress Store Action Helpers
 * Utility functions for complex action logic
 */

import { logger } from '@/lib/logger';
import { onLevelUp } from '@/lib/notifications/triggers';
import { calculateSeasonLevel } from '@/lib/constants/mirrorbucks';
import type { ProgressState, SessionGrade } from './progress-store-types';
import type { SeasonHistory } from '@/types';

/**
 * Handle level up notifications and toasts
 */
export async function handleLevelUp(
  newSeasonLevel: number,
  currentSeasonLevel: number,
  amount: number,
  reason?: string
): Promise<void> {
  if (newSeasonLevel > currentSeasonLevel) {
    onLevelUp(newSeasonLevel, `Livello ${newSeasonLevel}`);
  } else if (amount > 0) {
    try {
      const { default: toast } = await import('@/components/ui/toast');
      const msg = reason || 'MirrorBucks guadagnati';
      toast.success(`+${amount} MB`, msg, { duration: 3000 });
    } catch (err) {
      logger.warn('Failed to show MirrorBucks toast', { error: err });
    }
  }
}

/**
 * Create archived season history entry
 */
export function createSeasonHistory(state: ProgressState): SeasonHistory {
  return {
    season: state.currentSeason.name,
    year: state.currentSeason.startDate.getFullYear(),
    mirrorBucksEarned: state.seasonMirrorBucks,
    levelReached: state.seasonLevel,
    achievementsUnlocked: state.achievements.filter(
      (a) =>
        a.unlockedAt &&
        a.unlockedAt >= state.currentSeason.startDate &&
        a.unlockedAt <= state.currentSeason.endDate
    ).length,
    studyMinutes: state.totalStudyMinutes,
  };
}

/**
 * Calculate updated session after XP gain
 */
export function updateSessionWithMirrorBucks(
  currentSession: any,
  amount: number
) {
  if (!currentSession) return null;

  const newMbEarned = (currentSession.mirrorBucksEarned ?? 0) + amount;
  return {
    ...currentSession,
    xpEarned: newMbEarned,
    mirrorBucksEarned: newMbEarned,
  };
}

/**
 * Calculate streak updates
 */
export function calculateStreakUpdate(state: ProgressState): {
  current: number;
  longest: number;
  lastStudyDate: Date;
} {
  const today = new Date().toDateString();
  const lastStudy = state.streak.lastStudyDate;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let newCurrent = state.streak.current;
  if (!lastStudy || new Date(lastStudy).toDateString() !== today) {
    if (lastStudy && new Date(lastStudy).toDateString() === yesterday) {
      newCurrent++;
    } else if (!lastStudy || new Date(lastStudy).toDateString() !== yesterday) {
      newCurrent = 1;
    }
  }

  return {
    current: newCurrent,
    longest: Math.max(state.streak.longest, newCurrent),
    lastStudyDate: new Date(),
  };
}

/**
 * Calculate session duration in minutes
 */
export function getSessionDurationMinutes(startedAt: Date): number {
  return Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
}

/**
 * Calculate sessions in current week
 */
export function countSessionsThisWeek(
  sessionHistory: any[],
  newSession: any
): number {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return [newSession, ...sessionHistory].filter(
    (s) => new Date(s.startedAt) > weekAgo
  ).length;
}
