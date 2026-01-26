/**
 * Churn Analysis API
 * Returns churn metrics and at-risk users
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

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
  riskLevel: "high" | "medium" | "low";
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

export async function GET(request: NextRequest) {
  const adminAuth = await validateAdminAuth();
  if (!adminAuth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daysBack = parseInt(request.nextUrl.searchParams.get("days") ?? "30");
  const churnThresholdDays = parseInt(
    request.nextUrl.searchParams.get("churnDays") ?? "14",
  );

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const churnCutoff = new Date();
  churnCutoff.setDate(churnCutoff.getDate() - churnThresholdDays);

  try {
    // Get all unique visitors/users with their latest event
    const latestEvents = await prisma.$queryRaw<
      Array<{
        visitor_id: string | null;
        user_id: string | null;
        stage: string;
        last_activity: Date;
        first_activity: Date;
      }>
    >`
      SELECT
        visitor_id,
        user_id,
        stage,
        MAX(created_at) as last_activity,
        MIN(created_at) as first_activity
      FROM "FunnelEvent"
      WHERE created_at >= ${startDate}
        AND is_test_data = false
      GROUP BY COALESCE(visitor_id, user_id), visitor_id, user_id, stage
      HAVING MAX(created_at) = (
        SELECT MAX(fe2.created_at)
        FROM "FunnelEvent" fe2
        WHERE COALESCE(fe2.visitor_id, fe2.user_id) = COALESCE("FunnelEvent".visitor_id, "FunnelEvent".user_id)
      )
    `;

    // Analyze churn by stage
    const stageChurn = new Map<
      string,
      { entered: number; churned: number; daysToChurn: number[] }
    >();

    const atRiskUsers: AtRiskUser[] = [];
    let totalChurned = 0;
    const allDaysToChurn: number[] = [];

    for (const event of latestEvents) {
      const lastActivityDate = new Date(event.last_activity);
      const daysSince = Math.floor(
        (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const isConverted =
        event.stage === "ACTIVE" || event.stage === "FIRST_LOGIN";
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
          (lastActivityDate.getTime() -
            new Date(event.first_activity).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        stageData.daysToChurn.push(daysInStage);
        allDaysToChurn.push(daysInStage);
      }

      // Identify at-risk users (not churned yet, but close)
      if (!isConverted && !isChurned && daysSince >= 7) {
        const riskLevel: "high" | "medium" | "low" =
          daysSince >= 12 ? "high" : daysSince >= 10 ? "medium" : "low";

        atRiskUsers.push({
          visitorId: event.visitor_id,
          userId: event.user_id,
          lastStage: event.stage,
          lastActivity: lastActivityDate.toISOString(),
          daysSinceActivity: daysSince,
          riskLevel,
        });
      }
    }

    // Build stage metrics
    const byStage: ChurnByStage[] = Array.from(stageChurn.entries()).map(
      ([stage, data]) => ({
        stage,
        totalEntered: data.entered,
        churned: data.churned,
        churnRate: data.entered > 0 ? (data.churned / data.entered) * 100 : 0,
        avgDaysBeforeChurn:
          data.daysToChurn.length > 0
            ? data.daysToChurn.reduce((a, b) => a + b, 0) /
              data.daysToChurn.length
            : 0,
      }),
    );

    // Sort at-risk users by risk level
    atRiskUsers.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });

    const response: ChurnMetricsResponse = {
      overview: {
        totalVisitors: latestEvents.length,
        totalChurned,
        overallChurnRate:
          latestEvents.length > 0
            ? (totalChurned / latestEvents.length) * 100
            : 0,
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
  } catch (error) {
    logger.error(
      "Failed to fetch churn metrics",
      { component: "funnel-churn" },
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch churn metrics" },
      { status: 500 },
    );
  }
}
