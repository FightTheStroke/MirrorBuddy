/**
 * Telemetry stats helpers
 */

import type { ChartData, TimeSeriesPoint } from '@/lib/telemetry/types';

/**
 * Build daily activity chart (last 7 days)
 */
export function buildDailyActivityChart(
  sessions: Array<{ startedAt: Date; duration: number | null }>,
  now: Date
): ChartData[] {
  const minutesData: TimeSeriesPoint[] = [];
  const sessionsData: TimeSeriesPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const daySessions = sessions.filter(
      (s) => s.startedAt >= date && s.startedAt < nextDate
    );

    minutesData.push({
      timestamp: date,
      value: daySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
    });

    sessionsData.push({
      timestamp: date,
      value: daySessions.length,
    });
  }

  return [
    { label: 'Minuti di studio', color: '#3b82f6', data: minutesData },
    { label: 'Sessioni', color: '#10b981', data: sessionsData },
  ];
}

/**
 * Build feature usage chart
 */
export function buildFeatureUsageChart(
  events: Array<{ category: string; action: string }>
): ChartData[] {
  const featureCounts: Record<string, number> = {
    'Quiz': 0,
    'Flashcards': 0,
    'Voce': 0,
    'Chat': 0,
    'Mappe': 0,
  };

  events.forEach((e) => {
    if (e.category === 'education') {
      if (e.action.includes('quiz')) featureCounts['Quiz']++;
      if (e.action.includes('flashcard')) featureCounts['Flashcards']++;
      if (e.action.includes('mindmap')) featureCounts['Mappe']++;
    }
    if (e.category === 'conversation') {
      if (e.action.includes('voice')) featureCounts['Voce']++;
      else featureCounts['Chat']++;
    }
  });

  const now = new Date();
  return Object.entries(featureCounts)
    .filter(([, count]) => count > 0)
    .map(([label, count], index) => ({
      label,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index],
      data: [{ timestamp: now, value: count }],
    }));
}

/**
 * Build maestro preferences chart
 */
export function buildMaestroPreferencesChart(
  sessions: Array<{ maestroId: string }>
): ChartData[] {
  const maestroCounts: Record<string, number> = {};

  sessions.forEach((s) => {
    if (s.maestroId) {
      maestroCounts[s.maestroId] = (maestroCounts[s.maestroId] || 0) + 1;
    }
  });

  const top5 = Object.entries(maestroCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const now = new Date();

  return top5.map(([maestroId, count], index) => ({
    label: maestroId,
    color: colors[index],
    data: [{ timestamp: now, value: count }],
  }));
}

/**
 * Calculate study time trend
 */
export function calculateTrend(
  sessions: Array<{ startedAt: Date; duration: number | null }>,
  now: Date
): 'increasing' | 'stable' | 'decreasing' {
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const sixDaysAgo = new Date(now);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  const recentMinutes = sessions
    .filter((s) => s.startedAt >= threeDaysAgo)
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  const previousMinutes = sessions
    .filter((s) => s.startedAt >= sixDaysAgo && s.startedAt < threeDaysAgo)
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  const diff = recentMinutes - previousMinutes;
  const threshold = Math.max(previousMinutes * 0.2, 10);

  if (diff > threshold) return 'increasing';
  if (diff < -threshold) return 'decreasing';
  return 'stable';
}

/**
 * Calculate engagement score (0-100)
 */
export function calculateEngagementScore(metrics: {
  sessionsThisWeek: number;
  studyMinutesThisWeek: number;
  questionsThisWeek: number;
  maestrosUsedThisWeek: number;
}): number {
  const sessionScore = Math.min(metrics.sessionsThisWeek / 7, 1) * 30;
  const minuteScore = Math.min(metrics.studyMinutesThisWeek / 120, 1) * 30;
  const questionScore = Math.min(metrics.questionsThisWeek / 20, 1) * 25;
  const varietyScore = Math.min(metrics.maestrosUsedThisWeek / 3, 1) * 15;

  return Math.round(sessionScore + minuteScore + questionScore + varietyScore);
}
