/**
 * GET /api/admin/tiers/conversion-funnel
 * Tier conversion funnel analytics endpoint
 * Tracks Trial → Base → Pro conversion rates
 *
 * Query params:
 * - startDate: YYYY-MM-DD (default: 30 days ago)
 * - endDate: YYYY-MM-DD (default: today)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";

interface FunnelStage {
  tierCode: string;
  tierName: string;
  totalUsers: number;
  nextStageConversions: number | null;
  conversionRate: number | null;
}

interface TimeSeries {
  date: string;
  trialCount: number;
  baseCount: number;
  proCount: number;
  conversionsTrialToBase: number;
  conversionsBaseToProCount: number;
}

interface ConversionFunnelResponse {
  stages: FunnelStage[];
  summary: {
    trialToBaseRate: number;
    baseToProRate: number;
    trialToProRate: number;
    funnelEfficiency: number;
    totalUsersTracked: number;
    periodStart: string;
    periodEnd: string;
  };
  timeSeries: TimeSeries[];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const endDate = endDateParam ? new Date(endDateParam) : now;

    // Fetch all tier changes in the date range
    const tierAuditLogs = await prisma.tierAuditLog.findMany({
      where: {
        action: "TIER_CHANGE",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Get all tier definitions for naming
    const tiers = await prisma.tierDefinition.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    const _tierMap = new Map(
      tiers.map((t) => [t.code, { id: t.id, name: t.name }]),
    );

    // Calculate funnel metrics
    const trialToBaseConversions = tierAuditLogs.filter(
      (log) =>
        (log.changes as Record<string, string>)?.from === "trial" &&
        (log.changes as Record<string, string>)?.to === "base",
    ).length;

    const baseToProConversions = tierAuditLogs.filter(
      (log) =>
        (log.changes as Record<string, string>)?.from === "base" &&
        (log.changes as Record<string, string>)?.to === "pro",
    ).length;

    const trialToProConversions = tierAuditLogs.filter(
      (log) =>
        (log.changes as Record<string, string>)?.from === "trial" &&
        (log.changes as Record<string, string>)?.to === "pro",
    ).length;

    // Count unique users per stage
    const uniqueTrialUsers = new Set(
      tierAuditLogs
        .filter(
          (log) => (log.changes as Record<string, string>)?.from === "trial",
        )
        .map((log) => log.userId),
    ).size;

    const uniqueBaseUsers = new Set(
      tierAuditLogs
        .filter((log) => (log.changes as Record<string, string>)?.to === "base")
        .map((log) => log.userId),
    ).size;

    const uniqueProUsers = new Set(
      tierAuditLogs
        .filter((log) => (log.changes as Record<string, string>)?.to === "pro")
        .map((log) => log.userId),
    ).size;

    // Calculate conversion rates
    const trialToBaseRate =
      uniqueTrialUsers > 0
        ? (trialToBaseConversions / uniqueTrialUsers) * 100
        : 0;
    const baseToProRate =
      uniqueBaseUsers > 0 ? (baseToProConversions / uniqueBaseUsers) * 100 : 0;
    const trialToProRate =
      uniqueTrialUsers > 0
        ? (trialToProConversions / uniqueTrialUsers) * 100
        : 0;
    const funnelEfficiency =
      trialToBaseConversions > 0
        ? (baseToProConversions / trialToBaseConversions) * 100
        : 0;

    // Build funnel stages
    const stages: FunnelStage[] = [
      {
        tierCode: "trial",
        tierName: "Trial",
        totalUsers: uniqueTrialUsers,
        nextStageConversions: trialToBaseConversions,
        conversionRate: trialToBaseRate,
      },
      {
        tierCode: "base",
        tierName: "Base",
        totalUsers: uniqueBaseUsers,
        nextStageConversions: baseToProConversions,
        conversionRate: baseToProRate,
      },
      {
        tierCode: "pro",
        tierName: "Pro",
        totalUsers: uniqueProUsers,
        nextStageConversions: null,
        conversionRate: null,
      },
    ];

    // Generate time series data (daily)
    const timeSeriesMap = new Map<string, TimeSeries>();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      timeSeriesMap.set(dateStr, {
        date: dateStr,
        trialCount: 0,
        baseCount: 0,
        proCount: 0,
        conversionsTrialToBase: 0,
        conversionsBaseToProCount: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate time series
    tierAuditLogs.forEach((log) => {
      const dateStr = log.createdAt.toISOString().split("T")[0];
      const entry = timeSeriesMap.get(dateStr);

      if (entry) {
        if ((log.changes as Record<string, string>)?.from === "trial") {
          const to = (log.changes as Record<string, string>)?.to;
          if (to === "base") {
            entry.conversionsTrialToBase++;
          }
        } else if ((log.changes as Record<string, string>)?.from === "base") {
          const to = (log.changes as Record<string, string>)?.to;
          if (to === "pro") {
            entry.conversionsBaseToProCount++;
          }
        }
      }
    });

    // Count current tier distribution at each date
    tierAuditLogs.forEach((log) => {
      const dateStr = log.createdAt.toISOString().split("T")[0];
      const entry = timeSeriesMap.get(dateStr);

      if (entry) {
        const to = (log.changes as Record<string, string>)?.to;
        if (to === "trial") entry.trialCount++;
        else if (to === "base") entry.baseCount++;
        else if (to === "pro") entry.proCount++;
      }
    });

    const timeSeries = Array.from(timeSeriesMap.values());

    const response: ConversionFunnelResponse = {
      stages,
      summary: {
        trialToBaseRate: Math.round(trialToBaseRate * 100) / 100,
        baseToProRate: Math.round(baseToProRate * 100) / 100,
        trialToProRate: Math.round(trialToProRate * 100) / 100,
        funnelEfficiency: Math.round(funnelEfficiency * 100) / 100,
        totalUsersTracked: uniqueTrialUsers,
        periodStart: startDate.toISOString().split("T")[0],
        periodEnd: endDate.toISOString().split("T")[0],
      },
      timeSeries,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching conversion funnel:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversion funnel metrics" },
      { status: 500 },
    );
  }
}
