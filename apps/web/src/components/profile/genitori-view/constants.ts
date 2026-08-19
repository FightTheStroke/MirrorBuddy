/**
 * Constants for GenitoriView
 */

import { maestri } from '@/data/maestri';
import type { ParentDashboardActivity } from '@/types';

/**
 * Display names, derived from the roster so a newly added maestro cannot
 * appear in a parent's dashboard as a raw lowercase id.
 */
export const MAESTRO_NAMES: Record<string, string> = Object.fromEntries(
  maestri.map((m) => [m.id, m.displayName || m.name]),
);

/**
 * Empty activity data for when no profile exists yet.
 * Shows the dashboard structure with zero values.
 */
export const EMPTY_ACTIVITY: ParentDashboardActivity = {
  weeklyStats: {
    totalMinutes: 0,
    sessionsCount: 0,
    xpEarned: 0,
    mirrorBucksEarned: 0,
    questionsAsked: 0,
  },
  recentSessions: [],
  subjectBreakdown: [],
  quizStats: {
    totalAttempts: 0,
    averageScore: 0,
    bestScore: 0,
    bySubject: [],
  },
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    todayMinutes: 0,
    dailyGoalMinutes: 30,
    goalMetToday: false,
    activeDays: [],
  },
  gamification: {
    totalXp: 0,
    level: 1,
    mirrorBucks: 0,
  },
};
