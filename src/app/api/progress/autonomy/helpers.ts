/**
 * Autonomy metrics helper functions
 */

/**
 * Calculate streak consistency as a percentage (0-100)
 */
export function calculateStreakConsistency(
  progress: { streakCurrent: number; streakLongest: number } | null
): number {
  if (!progress) return 0;
  if (progress.streakLongest === 0) return 0;
  return Math.min(
    Math.round((progress.streakCurrent / Math.max(progress.streakLongest, 7)) * 100),
    100
  );
}

/**
 * Calculate how consistently the student studies (vs cramming)
 * Lower variance = more consistent = higher score
 */
export function calculateStudyTimeDistribution(
  sessions: Array<{ startedAt: Date; duration: number | null }>
): number {
  if (sessions.length < 7) return 50; // Not enough data

  const dayStudyMinutes: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  sessions.forEach(s => {
    const day = s.startedAt.getDay();
    dayStudyMinutes[day] += s.duration || 0;
  });

  const values = Object.values(dayStudyMinutes);
  const avg = values.reduce((a, b) => a + b, 0) / 7;

  if (avg === 0) return 50;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / 7;
  const coefficient = Math.sqrt(variance) / avg;

  return Math.max(0, Math.min(100, Math.round(100 - coefficient * 50)));
}

/**
 * Calculate percentage of started sessions that were completed
 */
export function calculateTaskCompletionRate(
  sessions: Array<{ endedAt: Date | null }>
): number {
  if (sessions.length === 0) return 100;
  const completed = sessions.filter(s => s.endedAt !== null).length;
  return Math.round((completed / sessions.length) * 100);
}

/**
 * Calculate average flashcard retrievability (0-100)
 */
export function calculateFlashcardRetention(
  flashcards: Array<{ retrievability: number }>
): number {
  if (flashcards.length === 0) return 0;
  const avgRetrievability = flashcards.reduce((sum, f) => sum + f.retrievability, 0) / flashcards.length;
  return Math.round(avgRetrievability * 100);
}

/**
 * Calculate average quiz score percentage
 */
export function calculateAverageQuizScore(quizResults: Array<{ percentage: number }>): number {
  if (quizResults.length === 0) return 0;
  return Math.round(quizResults.reduce((sum, q) => sum + q.percentage, 0) / quizResults.length);
}

/**
 * Calculate total mind maps created (any autonomy level)
 */
export function calculateMindMapsCreated(methodProgress: { mindMaps: string } | null): number {
  if (!methodProgress) return 0;
  try {
    const mindMaps = JSON.parse(methodProgress.mindMaps) as {
      createdAlone: number;
      createdWithHints: number;
      createdWithFullHelp: number;
    };
    return (
      (mindMaps.createdAlone || 0) +
      (mindMaps.createdWithHints || 0) +
      (mindMaps.createdWithFullHelp || 0)
    );
  } catch {
    return 0;
  }
}

/**
 * Calculate average session duration in minutes
 */
export function calculateAverageSessionDuration(
  sessions: Array<{ duration: number | null }>
): number {
  const sessionsWithDuration = sessions.filter(s => s.duration !== null && s.duration > 0);
  if (sessionsWithDuration.length === 0) return 0;
  return Math.round(
    sessionsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / sessionsWithDuration.length
  );
}

/**
 * Determine the student's preferred study time based on when they're most active
 */
export function determinePreferredStudyTime(
  sessions: Array<{ startedAt: Date }>
): 'morning' | 'afternoon' | 'evening' | 'night' | 'varied' {
  if (sessions.length < 3) return 'varied';

  const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  sessions.forEach(s => {
    const hour = s.startedAt.getHours();
    if (hour >= 5 && hour < 12) timeSlots.morning++;
    else if (hour >= 12 && hour < 17) timeSlots.afternoon++;
    else if (hour >= 17 && hour < 21) timeSlots.evening++;
    else timeSlots.night++;
  });

  const max = Math.max(...Object.values(timeSlots));
  const total = sessions.length;

  for (const [slot, count] of Object.entries(timeSlots)) {
    if (count === max && count / total > 0.5) {
      return slot as 'morning' | 'afternoon' | 'evening' | 'night';
    }
  }

  return 'varied';
}

/**
 * Calculate average XP earned per week
 */
export function calculateXpGrowthRate(
  sessions: Array<{ xpEarned: number; startedAt: Date }>
): number {
  if (sessions.length === 0) return 0;

  const weeklyXp: Record<string, number> = {};
  sessions.forEach(s => {
    const week = getWeekKey(s.startedAt);
    weeklyXp[week] = (weeklyXp[week] || 0) + s.xpEarned;
  });

  const weeks = Object.values(weeklyXp);
  if (weeks.length === 0) return 0;

  return Math.round(weeks.reduce((a, b) => a + b, 0) / weeks.length);
}

/**
 * Get ISO week key for a date
 */
export function getWeekKey(date: Date): string {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return startOfWeek.toISOString().split('T')[0];
}

/**
 * Determine improvement trend based on quiz results over time
 */
export function determineImprovementTrend(
  quizResults: Array<{ percentage: number; completedAt: Date }>
): 'improving' | 'stable' | 'declining' {
  if (quizResults.length < 3) return 'stable';

  const sorted = [...quizResults].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
  );

  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, q) => sum + q.percentage, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, q) => sum + q.percentage, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

/**
 * Calculate daily study metrics for the last 7 days
 */
export function calculateWeeklyActivity(
  sessions: Array<{ startedAt: Date; duration: number | null; xpEarned: number }>
): Array<{ day: string; studyMinutes: number; xpEarned: number }> {
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const now = new Date();
  const result: Array<{ day: string; studyMinutes: number; xpEarned: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const daySessions = sessions.filter(s => s.startedAt >= date && s.startedAt < nextDate);
    const studyMinutes = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const xpEarned = daySessions.reduce((sum, s) => sum + s.xpEarned, 0);

    result.push({
      day: days[date.getDay()],
      studyMinutes,
      xpEarned,
    });
  }

  return result;
}
