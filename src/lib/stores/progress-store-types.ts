/**
 * Progress Store Type Definitions
 * Separated from main store for maintainability
 */

import type { Streak, Achievement, SubjectMastery, Season, SeasonHistory } from '@/types';

// Session grade given by maestro (1-10 scale)
export interface SessionGrade {
  score: number; // 1-10
  feedback: string;
  strengths: string[];
  areasToImprove: string[];
}

export interface StudySession {
  id: string;
  maestroId: string;
  subject: string;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
  questionsAsked: number;
  /**
   * @deprecated Use `mirrorBucksEarned` instead. This field mirrors mirrorBucksEarned
   * for backward compatibility and will be removed in a future version.
   */
  xpEarned: number;
  /** Primary currency earned in this session - source of truth */
  mirrorBucksEarned: number;
  grade?: SessionGrade;
}

export interface ProgressState {
  // Backward compatibility (xp is alias for mirrorBucks)
  xp: number;
  mirrorBucks: number;
  level: number; // All-time level
  // Season system
  seasonMirrorBucks: number;
  seasonLevel: number;
  allTimeLevel: number;
  currentSeason: Season;
  seasonHistory: SeasonHistory[];
  // Other state
  streak: Streak;
  masteries: SubjectMastery[];
  achievements: Achievement[];
  totalStudyMinutes: number;
  sessionsThisWeek: number;
  questionsAsked: number;
  // Session tracking
  currentSession: StudySession | null;
  sessionHistory: StudySession[];
  // Sync state
  lastSyncedAt: Date | null;
  pendingSync: boolean;
  // Actions
  addXP: (amount: number) => void; // Backward compatibility
  addMirrorBucks: (amount: number, reason?: string, sourceId?: string, sourceType?: string) => void;
  updateStreak: (studyMinutes?: number) => void;
  updateMastery: (subjectMastery: SubjectMastery) => void;
  unlockAchievement: (achievementId: string) => void;
  addStudyMinutes: (minutes: number) => void;
  incrementQuestions: () => void;
  checkAndResetSeason: () => void;
  // Session actions
  startSession: (maestroId: string, subject: string) => void;
  endSession: (grade?: SessionGrade) => void;
  gradeCurrentSession: (grade: SessionGrade) => void;
  // Sync actions
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}
