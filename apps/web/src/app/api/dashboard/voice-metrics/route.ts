// ============================================================================
// API ROUTE: Voice Metrics Analytics
// GET: Voice session statistics for dashboard
// DATA: Uses SessionMetrics table (real voice minutes from sessions)
// SECURITY: Requires admin authentication
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { analyticsContext, withMetricTruth } from '@/lib/admin/analytics-metric-truth';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/dashboard/voice-metrics'),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = Number(searchParams.get('days') ?? '7');
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: 'Invalid days' }, { status: 400 });
  }
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  // F-06: Exclude test data from voice metrics statistics
  // Query SessionMetrics for sessions with voice usage
  const voiceSessions = await prisma.sessionMetrics.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      isTestData: false,
      voiceMinutes: { gt: 0 },
    },
    select: {
      voiceMinutes: true,
      createdAt: true,
      sessionId: true,
    },
  });

  // Aggregate totals
  const totalSessions = voiceSessions.length;
  const totalMinutes = voiceSessions.reduce((sum, s) => sum + (s.voiceMinutes || 0), 0);
  const avgMinutes = totalSessions > 0 ? totalMinutes / totalSessions : 0;

  // Daily breakdown
  const dailySessions: Record<string, number> = {};
  const dailyMinutes: Record<string, number> = {};
  for (const session of voiceSessions) {
    const day = session.createdAt.toISOString().split('T')[0];
    dailySessions[day] = (dailySessions[day] || 0) + 1;
    dailyMinutes[day] = (dailyMinutes[day] || 0) + (session.voiceMinutes || 0);
  }

  return NextResponse.json(
    withMetricTruth(
      {
        period: { days, startDate: startDate.toISOString() },
        voice: {
          totalSessions,
          totalMinutes: Math.round(totalMinutes * 10) / 10,
          avgSessionMinutes: totalSessions > 0 ? Math.round(avgMinutes * 10) / 10 : null,
        },
        dailySessions,
        dailyMinutes,
      },
      analyticsContext('SessionMetrics (voiceMinutes>0, isTestData=false)', startDate, endDate),
      {
        'voice.avgSessionMinutes': { reason: totalSessions === 0 ? 'zeroDenominator' : null },
      },
    ),
  );
});
