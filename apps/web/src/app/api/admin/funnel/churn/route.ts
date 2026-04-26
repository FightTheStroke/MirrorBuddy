/**
 * Churn Analysis API
 * Returns churn metrics and at-risk users
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';

export const revalidate = 0;

interface ChurnByStage {
  stage: string;
  totalEntered: number;
  churned: number;
  churnRate: number;
  avgDaysBeforeChurn: number;
}

interface AtRiskUser {
  visitorId: string | null;
  userId: string | null;
  lastStage: string;
  lastActivity: string;
  daysSinceActivity: number;
  riskLevel: 'high' | 'medium' | 'low';
}

interface ChurnMetricsResponse {
  overview: {
    totalVisitors: number;
    totalChurned: number;
    overallChurnRate: number;
    avgDaysToChurn: number;
  };
  byStage: ChurnByStage[];
  atRiskUsers: AtRiskUser[];
  period: {
    start: string;
    end: string;
  };
}

export const GET = pipe(
  withSentry('/api/admin/funnel/churn'),
  withAdminReadOnly,
)(async (ctx) => {
  const daysBack = parseInt(ctx.req.nextUrl.searchParams.get('days') ?? '30');
  const churnThresholdDays = parseInt(ctx.req.nextUrl.searchParams.get('churnDays') ?? '14');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const churnCutoff = new Date();
  churnCutoff.setDate(churnCutoff.getDate() - churnThresholdDays);
  // Get all unique visitors/users with their latest event
  const latestEvents = await prisma.$queryRaw<
    Array<{
      visitorId: string | null;
      userId: string | null;
      stage: string;
      lastActivity: Date;
      firstActivity: Date;
    }>
  >`
      SELECT
        "visitorId",
        "userId",
        "stage",
        MAX("createdAt") as "lastActivity",
        MIN("createdAt") as "firstActivity"
      FROM "FunnelEvent"
      WHERE "createdAt" >= ${startDate}
        AND "isTestData" = false
      GROUP BY COALESCE("visitorId", "userId"), "visitorId", "userId", "stage"
      HAVING MAX("createdAt") = (
        SELECT MAX(fe2."createdAt")
        FROM "FunnelEvent" fe2
        WHERE COALESCE(fe2."visitorId", fe2."userId") = COALESCE("FunnelEvent"."visitorId", "FunnelEvent"."userId")
      )
    `;

  // Analyze churn by stage
  const stageChurn = new Map<string, { entered: number; churned: number; daysToChurn: number[] }>();

  const atRiskUsers: AtRiskUser[] = [];
  let totalChurned = 0;
  const allDaysToChurn: number[] = [];

  for (const event of latestEvents) {
    const lastActivityDate = new Date(event.lastActivity);
    const daysSince = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

    const isConverted = event.stage === 'ACTIVE' || event.stage === 'FIRST_LOGIN';
    const isChurned = !isConverted && lastActivityDate < churnCutoff;

    // Track stage metrics
    if (!stageChurn.has(event.stage)) {
      stageChurn.set(event.stage, {
        entered: 0,
        churned: 0,
        daysToChurn: [],
      });
    }
    const stageData = stageChurn.get(event.stage)!;
    stageData.entered++;

    if (isChurned) {
      stageData.churned++;
      totalChurned++;
      const daysInStage = Math.floor(
        (lastActivityDate.getTime() - new Date(event.firstActivity).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      stageData.daysToChurn.push(daysInStage);
      allDaysToChurn.push(daysInStage);
    }

    // Identify at-risk users (not churned yet, but close)
    if (!isConverted && !isChurned && daysSince >= 7) {
      const riskLevel: 'high' | 'medium' | 'low' =
        daysSince >= 12 ? 'high' : daysSince >= 10 ? 'medium' : 'low';

      atRiskUsers.push({
        visitorId: event.visitorId,
        userId: event.userId,
        lastStage: event.stage,
        lastActivity: lastActivityDate.toISOString(),
        daysSinceActivity: daysSince,
        riskLevel,
      });
    }
  }

  // Build stage metrics
  const byStage: ChurnByStage[] = Array.from(stageChurn.entries()).map(([stage, data]) => ({
    stage,
    totalEntered: data.entered,
    churned: data.churned,
    churnRate: data.entered > 0 ? (data.churned / data.entered) * 100 : 0,
    avgDaysBeforeChurn:
      data.daysToChurn.length > 0
        ? data.daysToChurn.reduce((a, b) => a + b, 0) / data.daysToChurn.length
        : 0,
  }));

  // Sort at-risk users by risk level
  atRiskUsers.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });

  const response: ChurnMetricsResponse = {
    overview: {
      totalVisitors: latestEvents.length,
      totalChurned,
      overallChurnRate: latestEvents.length > 0 ? (totalChurned / latestEvents.length) * 100 : 0,
      avgDaysToChurn:
        allDaysToChurn.length > 0
          ? allDaysToChurn.reduce((a, b) => a + b, 0) / allDaysToChurn.length
          : 0,
    },
    byStage,
    atRiskUsers: atRiskUsers.slice(0, 50), // Limit to top 50
    period: {
      start: startDate.toISOString(),
      end: new Date().toISOString(),
    },
  };

  return NextResponse.json(response);
});
