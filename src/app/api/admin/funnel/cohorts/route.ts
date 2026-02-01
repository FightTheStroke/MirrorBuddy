/**
 * Cohort Analysis API
 * Returns weekly cohorts with funnel progression
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { FUNNEL_STAGES, type FunnelStage } from "@/lib/funnel/constants";

export const dynamic = "force-dynamic";

interface CohortData {
  week: string; // ISO week start date
  weekLabel: string; // e.g., "W3 Jan 2026"
  totalUsers: number;
  stageBreakdown: Record<FunnelStage, number>;
  conversionToTrial: number;
  conversionToActive: number;
  retention7d: number;
  retention14d: number;
}

interface CohortsResponse {
  cohorts: CohortData[];
  stages: readonly string[];
  period: {
    start: string;
    end: string;
    weeksIncluded: number;
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(date: Date): string {
  const months = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];
  const weekNum = Math.ceil(date.getDate() / 7);
  return `W${weekNum} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export const GET = pipe(
  withSentry("/api/admin/funnel/cohorts"),
  withAdmin,
)(async (ctx) => {
  const weeksBack = parseInt(ctx.req.nextUrl.searchParams.get("weeks") ?? "8");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeksBack * 7);
  const weekStart = getWeekStart(startDate);
  // Get all funnel events in period
  const events = await prisma.funnelEvent.findMany({
    where: {
      createdAt: { gte: weekStart },
      isTestData: false,
    },
    select: {
      visitorId: true,
      userId: true,
      stage: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group users by their first event week
  const userFirstWeek = new Map<string, Date>();
  const userStages = new Map<string, Set<string>>();
  const userLastActivity = new Map<string, Date>();

  for (const event of events) {
    const userId = event.userId || event.visitorId || "";
    if (!userId) continue;

    // Track first week
    if (!userFirstWeek.has(userId)) {
      userFirstWeek.set(userId, getWeekStart(event.createdAt));
    }

    // Track all stages reached
    if (!userStages.has(userId)) {
      userStages.set(userId, new Set());
    }
    userStages.get(userId)!.add(event.stage);

    // Track last activity
    const current = userLastActivity.get(userId);
    if (!current || event.createdAt > current) {
      userLastActivity.set(userId, event.createdAt);
    }
  }

  // Build cohorts
  const cohortMap = new Map<string, CohortData>();

  for (const [userId, firstWeek] of userFirstWeek) {
    const weekKey = firstWeek.toISOString().split("T")[0];

    if (!cohortMap.has(weekKey)) {
      cohortMap.set(weekKey, {
        week: weekKey,
        weekLabel: formatWeekLabel(firstWeek),
        totalUsers: 0,
        stageBreakdown: Object.fromEntries(
          FUNNEL_STAGES.map((s) => [s, 0]),
        ) as Record<FunnelStage, number>,
        conversionToTrial: 0,
        conversionToActive: 0,
        retention7d: 0,
        retention14d: 0,
      });
    }

    const cohort = cohortMap.get(weekKey)!;
    cohort.totalUsers++;

    const stages = userStages.get(userId) || new Set();
    const lastActivity = userLastActivity.get(userId);

    // Count highest stage reached
    for (const stage of FUNNEL_STAGES) {
      if (stages.has(stage)) {
        cohort.stageBreakdown[stage]++;
      }
    }

    // Conversion metrics
    if (stages.has("TRIAL_START") || stages.has("TRIAL_ENGAGED")) {
      cohort.conversionToTrial++;
    }
    if (stages.has("ACTIVE") || stages.has("FIRST_LOGIN")) {
      cohort.conversionToActive++;
    }

    // Retention metrics
    if (lastActivity) {
      const daysSinceStart = Math.floor(
        (lastActivity.getTime() - firstWeek.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceStart >= 7) cohort.retention7d++;
      if (daysSinceStart >= 14) cohort.retention14d++;
    }
  }

  // Convert to array and calculate percentages
  const cohorts = Array.from(cohortMap.values())
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((cohort) => ({
      ...cohort,
      conversionToTrial:
        cohort.totalUsers > 0
          ? Math.round((cohort.conversionToTrial / cohort.totalUsers) * 100)
          : 0,
      conversionToActive:
        cohort.totalUsers > 0
          ? Math.round((cohort.conversionToActive / cohort.totalUsers) * 100)
          : 0,
      retention7d:
        cohort.totalUsers > 0
          ? Math.round((cohort.retention7d / cohort.totalUsers) * 100)
          : 0,
      retention14d:
        cohort.totalUsers > 0
          ? Math.round((cohort.retention14d / cohort.totalUsers) * 100)
          : 0,
    }));

  const response: CohortsResponse = {
    cohorts,
    stages: FUNNEL_STAGES,
    period: {
      start: weekStart.toISOString(),
      end: new Date().toISOString(),
      weeksIncluded: cohorts.length,
    },
  };

  return NextResponse.json(response);
});
