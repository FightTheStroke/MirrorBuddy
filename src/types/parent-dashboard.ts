// ============================================================================
// PARENT DASHBOARD ACTIVITY TYPES
// Types for activity overview, sessions, and quiz stats
// ============================================================================

/**
 * Weekly statistics for parent dashboard
 */
export interface WeeklyStats {
  totalMinutes: number;
  sessionsCount: number;
  xpEarned: number;
  mirrorBucksEarned: number;
  questionsAsked: number;
}

/**
 * Study session summary for display
 */
export interface StudySessionSummary {
  id: string;
  maestroId: string;
  maestroName: string;
  subject: string;
  startedAt: string;
  duration: number | null;
  xpEarned: number;
}

/**
 * Subject breakdown for progress visualization
 */
export interface SubjectBreakdown {
  subject: string;
  subjectName: string;
  minutes: number;
  percentage: number;
  sessionsCount: number;
}

/**
 * Quiz statistics aggregated by subject
 */
export interface QuizSubjectStats {
  subject: string;
  subjectName: string;
  attempts: number;
  averageScore: number;
  bestScore: number;
}

/**
 * Overall quiz statistics
 */
export interface QuizStats {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  bySubject: QuizSubjectStats[];
}

/**
 * Streak information with calendar data
 */
export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  todayMinutes: number;
  dailyGoalMinutes: number;
  goalMetToday: boolean;
  activeDays: string[]; // ISO date strings for calendar
}

/**
 * Complete parent dashboard activity response
 */
export interface ParentDashboardActivity {
  weeklyStats: WeeklyStats;
  recentSessions: StudySessionSummary[];
  subjectBreakdown: SubjectBreakdown[];
  quizStats: QuizStats;
  streak: StreakInfo;
  gamification: {
    totalXp: number;
    level: number;
    mirrorBucks: number;
  };
}
