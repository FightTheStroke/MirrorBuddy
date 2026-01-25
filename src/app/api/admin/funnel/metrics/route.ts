/**
 * Funnel Metrics API
 * Returns aggregate funnel conversion metrics
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { FUNNEL_STAGES } from "@/lib/funnel/constants";

export const dynamic = "force-dynamic";

interface StageMetrics {
  stage: string;
  count: number;
  conversionRate: number | null; // null for first stage
  avgTimeFromPrevious: number | null; // milliseconds
}

interface FunnelMetricsResponse {
  stages: StageMetrics[];
  totals: {
    uniqueVisitors: number;
    uniqueConverted: number; // reached ACTIVE
    overallConversionRate: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export async function GET(request: Request) {
  // Admin auth check
  const adminAuth = await validateAdminAuth();
  if (!adminAuth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const daysBack = parseInt(url.searchParams.get("days") ?? "30");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  try {
    // Get counts per stage (excluding test data)
    const stageCounts = await prisma.funnelEvent.groupBy({
      by: ["stage"],
      where: {
        createdAt: { gte: startDate },
        isTestData: false,
      },
      _count: { _all: true },
    });

    // Build stage metrics with conversion rates
    const stageCountMap = new Map(
      stageCounts.map((s: { stage: string; _count: { _all: number } }) => [
        s.stage,
        s._count._all,
      ]),
    );

    const stages: StageMetrics[] = FUNNEL_STAGES.map((stage, idx) => {
      const count: number = stageCountMap.get(stage) ?? 0;
      const prevCount: number | null =
        idx > 0 ? (stageCountMap.get(FUNNEL_STAGES[idx - 1]) ?? 0) : null;

      return {
        stage,
        count,
        conversionRate:
          prevCount !== null && prevCount > 0
            ? (count / prevCount) * 100
            : null,
        avgTimeFromPrevious: null, // Could calculate with more complex query
      };
    });

    // Get unique visitor/user counts (count visitorId and userId separately to avoid double-counting)
    const [uniqueVisitorIds, uniqueUserIds] = await Promise.all([
      prisma.funnelEvent.findMany({
        where: {
          stage: "VISITOR",
          createdAt: { gte: startDate },
          isTestData: false,
          visitorId: { not: null },
        },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
      prisma.funnelEvent.findMany({
        where: {
          stage: "VISITOR",
          createdAt: { gte: startDate },
          isTestData: false,
          userId: { not: null },
          visitorId: null, // Only count userId if no visitorId (converted users)
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);
    const uniqueVisitors = [...uniqueVisitorIds, ...uniqueUserIds];

    const [convertedVisitorIds, convertedUserIds] = await Promise.all([
      prisma.funnelEvent.findMany({
        where: {
          stage: "ACTIVE",
          createdAt: { gte: startDate },
          isTestData: false,
          visitorId: { not: null },
        },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
      prisma.funnelEvent.findMany({
        where: {
          stage: "ACTIVE",
          createdAt: { gte: startDate },
          isTestData: false,
          userId: { not: null },
          visitorId: null,
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);
    const uniqueConverted = [...convertedVisitorIds, ...convertedUserIds];

    const response: FunnelMetricsResponse = {
      stages,
      totals: {
        uniqueVisitors: uniqueVisitors.length,
        uniqueConverted: uniqueConverted.length,
        overallConversionRate:
          uniqueVisitors.length > 0
            ? (uniqueConverted.length / uniqueVisitors.length) * 100
            : 0,
      },
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[funnel/metrics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
