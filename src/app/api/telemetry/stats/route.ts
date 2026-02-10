/**
 * API ROUTE: Telemetry Stats
 * GET: Return aggregated usage statistics for dashboard visualization
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import type { UsageStats } from '@/lib/telemetry/types';
import {
  buildDailyActivityChart,
  buildFeatureUsageChart,
  buildMaestroPreferencesChart,
  calculateTrend,
  calculateEngagementScore,
} from './helpers';

export const GET = pipe(
  withSentry('/api/telemetry/stats'),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [todayEvents, weekEvents, sessions, studySessions] = await Promise.all([
    prisma.telemetryEvent.findMany({
      where: {
        userId,
        timestamp: { gte: todayStart },
      },
      take: 5000,
    }),
    prisma.telemetryEvent.findMany({
      where: {
        userId,
        timestamp: { gte: weekStart },
      },
      take: 10000,
      orderBy: { timestamp: 'asc' },
    }),
    prisma.telemetryEvent.findMany({
      where: {
        userId,
        category: 'navigation',
        action: 'session_started',
        timestamp: { gte: weekStart },
      },
      take: 1000,
    }),
    prisma.studySession.findMany({
      where: {
        userId,
        startedAt: { gte: weekStart },
      },
      take: 1000,
      orderBy: { startedAt: 'asc' },
    }),
  ]);

  const todaySessions = todayEvents.filter(
    (e) => e.category === 'navigation' && e.action === 'session_started',
  ).length;

  const todayStudyMinutes = studySessions
    .filter((s) => s.startedAt >= todayStart)
    .reduce((sum, s) => sum + (s.duration || 0), 0);

  const todayQuestions = todayEvents.filter(
    (e) => e.category === 'conversation' && e.action === 'question_asked',
  ).length;

  const weeklyActiveMinutes = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  const weeklyMaestrosUsed = [...new Set(studySessions.map((s) => s.maestroId).filter(Boolean))];

  const dailyActivityChart = buildDailyActivityChart(studySessions, now);
  const featureUsageChart = buildFeatureUsageChart(weekEvents);
  const maestroPreferencesChart = buildMaestroPreferencesChart(studySessions);
  const studyTimeTrend = calculateTrend(studySessions, now);

  const engagementScore = calculateEngagementScore({
    sessionsThisWeek: sessions.length,
    studyMinutesThisWeek: weeklyActiveMinutes,
    questionsThisWeek: weekEvents.filter(
      (e) => e.category === 'conversation' && e.action === 'question_asked',
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
});
