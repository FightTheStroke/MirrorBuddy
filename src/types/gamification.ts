// ============================================================================
// GAMIFICATION TYPES - Progress, Achievements, Streaks, Mastery
// ============================================================================

import type { Subject } from './content';

export type MasteryTier =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'master';

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
  category: 'study' | 'mastery' | 'streak' | 'social' | 'exploration' | 'xp';
  requirement: number;
  xpReward: number;
  unlockedAt?: Date;
}

export interface Progress {
  xp: number;
  level: number;
  xpToNextLevel: number;
  streak: Streak;
  masteries: SubjectMastery[];
  achievements: Achievement[];
  totalStudyMinutes: number;
  sessionsThisWeek: number;
  questionsAsked: number;
}

// === GRADE TYPES (Italian System) ===

export type GradeType =
  | 'quiz'
  | 'homework'
  | 'test'
  | 'participation'
  | 'project'
  | 'oral';

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
  trend: 'improving' | 'stable' | 'declining';
}
