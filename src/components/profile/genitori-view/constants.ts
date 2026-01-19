/**
 * Constants for GenitoriView
 */

import type { ParentDashboardActivity } from "@/types";

export const DEMO_USER_ID = "demo-student-1";

export const MAESTRO_NAMES: Record<string, string> = {
  leonardo: "Leonardo",
  galileo: "Galileo",
  curie: "Marie Curie",
  cicerone: "Cicerone",
  lovelace: "Ada Lovelace",
  smith: "Adam Smith",
  shakespeare: "Shakespeare",
  humboldt: "Humboldt",
  erodoto: "Erodoto",
  manzoni: "Manzoni",
  euclide: "Euclide",
  mozart: "Mozart",
  socrate: "Socrate",
  ippocrate: "Ippocrate",
  feynman: "Feynman",
  darwin: "Darwin",
  chris: "Chris",
};

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
