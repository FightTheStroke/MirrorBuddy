/**
 * Autonomy metrics types
 */

/**
 * Autonomy metrics provide insights into how independently a student is learning.
 * These metrics are used for:
 * 1. Parent dashboard - showing learning progress
 * 2. Coach suggestions - identifying when student needs support
 * 3. Gamification - rewarding autonomous behavior
 */
export interface AutonomyMetrics {
  // Overall independence score (0-100)
  independenceScore: number;

  // Self-regulation metrics
  selfRegulation: {
    streakConsistency: number; // How consistent their daily study is
    studyTimeDistribution: number; // Regular vs cramming (0 = cramming, 100 = regular)
    taskCompletionRate: number; // % of started tasks completed
  };

  // Tool usage patterns
  toolUsage: {
    flashcardsActive: boolean;
    flashcardRetention: number; // Average retrievability
    quizParticipation: number; // Quizzes taken in last 30 days
    averageQuizScore: number;
    mindMapsCreated: number;
  };

  // Learning patterns
  learningPatterns: {
    averageSessionDuration: number; // Minutes
    questionsPerSession: number;
    preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night' | 'varied';
    subjectsExplored: number;
    maestrosUsed: number;
  };

  // Growth indicators
  growth: {
    xpGrowthRate: number; // XP gained per week (avg)
    levelProgress: number; // Progress to next level (0-100)
    improvementTrend: 'improving' | 'stable' | 'declining';
  };

  // Time-based data for charts
  weeklyActivity: Array<{
    day: string;
    studyMinutes: number;
    xpEarned: number;
  }>;

  // Metadata
  lastCalculated: string;
  dataQuality: 'high' | 'medium' | 'low'; // Based on amount of data available
}
