// ============================================================================
// API ROUTE: Telemetry Stats
// GET: Return aggregated usage statistics for dashboard visualization
// ============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { UsageStats, ChartData, TimeSeriesPoint } from '@/lib/telemetry/types';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    // Fetch all data in parallel
    const [
      todayEvents,
      weekEvents,
      sessions,
      studySessions,
    ] = await Promise.all([
      // Today's telemetry events
      prisma.telemetryEvent.findMany({
        where: {
          userId,
          timestamp: { gte: todayStart },
        },
      }),
      // Week's telemetry events
      prisma.telemetryEvent.findMany({
        where: {
          userId,
          timestamp: { gte: weekStart },
        },
        orderBy: { timestamp: 'asc' },
      }),
      // All sessions from telemetry (session_started events)
      prisma.telemetryEvent.findMany({
        where: {
          userId,
          category: 'navigation',
          action: 'session_started',
          timestamp: { gte: weekStart },
        },
      }),
      // Study sessions from progress
      prisma.studySession.findMany({
        where: {
          userId,
          startedAt: { gte: weekStart },
        },
        orderBy: { startedAt: 'asc' },
      }),
    ]);

    // Calculate today's stats
    const todaySessions = todayEvents.filter(
      (e) => e.category === 'navigation' && e.action === 'session_started'
    ).length;

    const todayStudyMinutes = studySessions
      .filter((s) => s.startedAt >= todayStart)
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    const todayQuestions = todayEvents.filter(
      (e) => e.category === 'conversation' && e.action === 'question_asked'
    ).length;

    // Calculate weekly stats
    const weeklyActiveMinutes = studySessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    );

    const weeklyMaestrosUsed = [
      ...new Set(studySessions.map((s) => s.maestroId).filter(Boolean)),
    ];

    // Build daily activity chart (last 7 days)
    const dailyActivityChart = buildDailyActivityChart(studySessions, now);

    // Build feature usage chart
    const featureUsageChart = buildFeatureUsageChart(weekEvents);

    // Build maestro preferences chart
    const maestroPreferencesChart = buildMaestroPreferencesChart(studySessions);

    // Determine study time trend
    const studyTimeTrend = calculateTrend(studySessions, now);

    // Calculate engagement score (0-100)
    const engagementScore = calculateEngagementScore({
      sessionsThisWeek: sessions.length,
      studyMinutesThisWeek: weeklyActiveMinutes,
      questionsThisWeek: weekEvents.filter(
        (e) => e.category === 'conversation' && e.action === 'question_asked'
      ).length,
      maestrosUsedThisWeek: weeklyMaestrosUsed.length,
    });

    const stats: UsageStats = {
      todaySessions,
      todayStudyMinutes,
      todayQuestions,
      weeklyActiveMinutes,
      weeklySessionsCount: sessions.length,
      weeklyMaestrosUsed,
      dailyActivityChart,
      featureUsageChart,
      maestroPreferencesChart,
      studyTimeTrend,
      engagementScore,
      lastUpdated: now,
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Telemetry stats GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch telemetry stats' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildDailyActivityChart(
  sessions: Array<{ startedAt: Date; duration: number | null }>,
  now: Date
): ChartData[] {
  // Day labels are handled in frontend using timestamp
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

function buildFeatureUsageChart(
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

  // Convert to chart format (as pie-chart-ready data)
  const now = new Date();
  return Object.entries(featureCounts)
    .filter(([, count]) => count > 0)
    .map(([label, count], index) => ({
      label,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index],
      data: [{ timestamp: now, value: count }],
    }));
}

function buildMaestroPreferencesChart(
  sessions: Array<{ maestroId: string }>
): ChartData[] {
  const maestroCounts: Record<string, number> = {};

  sessions.forEach((s) => {
    if (s.maestroId) {
      maestroCounts[s.maestroId] = (maestroCounts[s.maestroId] || 0) + 1;
    }
  });

  // Get top 5 maestros
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

function calculateTrend(
  sessions: Array<{ startedAt: Date; duration: number | null }>,
  now: Date
): 'increasing' | 'stable' | 'decreasing' {
  // Compare last 3 days vs previous 3 days
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
  const threshold = Math.max(previousMinutes * 0.2, 10); // 20% change or 10 min

  if (diff > threshold) return 'increasing';
  if (diff < -threshold) return 'decreasing';
  return 'stable';
}

function calculateEngagementScore(metrics: {
  sessionsThisWeek: number;
  studyMinutesThisWeek: number;
  questionsThisWeek: number;
  maestrosUsedThisWeek: number;
}): number {
  // Weighted score based on multiple factors
  const sessionScore = Math.min(metrics.sessionsThisWeek / 7, 1) * 30; // Max 30 points
  const minuteScore = Math.min(metrics.studyMinutesThisWeek / 120, 1) * 30; // Max 30 points (2 hours)
  const questionScore = Math.min(metrics.questionsThisWeek / 20, 1) * 25; // Max 25 points
  const varietyScore = Math.min(metrics.maestrosUsedThisWeek / 3, 1) * 15; // Max 15 points (3 maestros)

  return Math.round(sessionScore + minuteScore + questionScore + varietyScore);
}
