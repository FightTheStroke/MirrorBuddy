// ============================================================================
// GAMIFICATION TYPES - Progress, Achievements, Streaks, Mastery
// ============================================================================

import type { Subject } from "./content";

export type MasteryTier =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "master";

export interface SubjectMastery {
  subject: Subject;
  percentage: number;
  tier: MasteryTier;
  topicsCompleted: number;
  totalTopics: number;
  lastStudied?: Date;
}

export interface Streak {
  current: number;
  longest: number;
  lastStudyDate?: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | "study"
    | "mastery"
    | "streak"
    | "social"
    | "exploration"
    | "xp"
    | "onboarding"
    | "time"
    | "independence";
  requirement: number;
  xpReward: number;
  mirrorBucksReward: number;
  unlockedAt?: Date;
  condition?: (state: Record<string, unknown>) => boolean;
}

export interface Progress {
  /**
   * @deprecated Use `mirrorBucks` instead. This field exists only for backward
   * compatibility with legacy code. It mirrors the value of `mirrorBucks` and
   * should be treated as read-only. Will be removed in a future version.
   */
  xp: number;
  /** Primary currency - source of truth for all points/rewards */
  mirrorBucks: number;
  level: number;
  xpToNextLevel: number;
  streak: Streak;
  masteries: SubjectMastery[];
  achievements: Achievement[];
  totalStudyMinutes: number;
  sessionsThisWeek: number;
  questionsAsked: number;
  // Season system
  seasonMirrorBucks: number;
  seasonLevel: number;
  allTimeLevel: number;
  currentSeason: Season;
  seasonHistory: SeasonHistory[];
}

// === SEASON TYPES ===

export type SeasonName = "Autunno" | "Inverno" | "Primavera" | "Estate";

export interface Season {
  name: SeasonName;
  startDate: Date;
  endDate: Date;
  icon: string;
}

export interface SeasonHistory {
  season: SeasonName;
  year: number;
  mirrorBucksEarned: number;
  levelReached: number;
  achievementsUnlocked: number;
  studyMinutes: number;
}

// === GRADE TYPES (Italian System) ===

export type GradeType =
  | "quiz"
  | "homework"
  | "test"
  | "participation"
  | "project"
  | "oral";

export interface Grade {
  id: string;
  value: number; // 1-10 Italian scale
  subject: Subject;
  type: GradeType;
  description: string;
  date: Date;
}

export interface SubjectGrades {
  subject: Subject;
  grades: Grade[];
  average: number;
  trend: "improving" | "stable" | "declining";
}
