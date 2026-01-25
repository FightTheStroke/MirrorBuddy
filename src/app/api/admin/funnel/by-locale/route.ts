/**
 * GET /api/admin/funnel/by-locale
 * Funnel analytics segmented by locale
 * Tracks conversion metrics across different language/regions
 *
 * Query params:
 * - startDate: YYYY-MM-DD (default: 30 days ago)
 * - endDate: YYYY-MM-DD (default: today)
 * - stage: Optional specific stage filter
 *
 * Plan T6-04: Locale segmentation for conversion funnel
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";

interface LocaleFunnelMetrics {
  locale: string;
  stageBreakdown: {
    [stage: string]: number;
  };
  conversionRates: {
    visitorToTrialStart: number;
    trialStartToEngaged: number;
    engagedToLimitHit: number;
    limitHitToBetaRequest: number;
    betaRequestToApproved: number;
    approvedToFirstLogin: number;
    firstLoginToActive: number;
  };
  totalEvents: number;
  uniqueVisitors: number;
  uniqueUsers: number;
}

interface LocaleFunnelResponse {
  summary: {
    totalLocales: number;
    totalEvents: number;
    periodStart: string;
    periodEnd: string;
  };
  byLocale: LocaleFunnelMetrics[];
  topLocales: Array<{
    locale: string;
    events: number;
    conversionToTrialStart: number;
  }>;
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

    // Fetch all funnel events in the date range
    const funnelEvents = await prisma.funnelEvent.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isTestData: false,
      },
      select: {
        id: true,
        visitorId: true,
        userId: true,
        stage: true,
        locale: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by locale
    const localeMap = new Map<string, typeof funnelEvents>();

    funnelEvents.forEach((event) => {
      const locale = event.locale || "unknown";
      if (!localeMap.has(locale)) {
        localeMap.set(locale, []);
      }
      localeMap.get(locale)!.push(event);
    });

    // Calculate metrics per locale
    const byLocale: LocaleFunnelMetrics[] = [];

    localeMap.forEach((events, locale) => {
      // Stage breakdown
      const stageBreakdown: { [stage: string]: number } = {};
      events.forEach((event) => {
        stageBreakdown[event.stage] =
          (stageBreakdown[event.stage] || 0) + 1;
      });

      // Unique visitors and users
      const uniqueVisitors = new Set(events.map((e) => e.visitorId)).size;
      const uniqueUsers = new Set(events.map((e) => e.userId)).size;

      // Count stage transitions for conversion rates
      const stageCounts = {
        visitor: stageBreakdown["VISITOR"] || 0,
        trialStart: stageBreakdown["TRIAL_START"] || 0,
        trialEngaged: stageBreakdown["TRIAL_ENGAGED"] || 0,
        limitHit: stageBreakdown["LIMIT_HIT"] || 0,
        betaRequest: stageBreakdown["BETA_REQUEST"] || 0,
        approved: stageBreakdown["APPROVED"] || 0,
        firstLogin: stageBreakdown["FIRST_LOGIN"] || 0,
        active: stageBreakdown["ACTIVE"] || 0,
      };

      const conversionRates = {
        visitorToTrialStart:
          stageCounts.visitor > 0
            ? (stageCounts.trialStart / stageCounts.visitor) * 100
            : 0,
        trialStartToEngaged:
          stageCounts.trialStart > 0
            ? (stageCounts.trialEngaged / stageCounts.trialStart) * 100
            : 0,
        engagedToLimitHit:
          stageCounts.trialEngaged > 0
            ? (stageCounts.limitHit / stageCounts.trialEngaged) * 100
            : 0,
        limitHitToBetaRequest:
          stageCounts.limitHit > 0
            ? (stageCounts.betaRequest / stageCounts.limitHit) * 100
            : 0,
        betaRequestToApproved:
          stageCounts.betaRequest > 0
            ? (stageCounts.approved / stageCounts.betaRequest) * 100
            : 0,
        approvedToFirstLogin:
          stageCounts.approved > 0
            ? (stageCounts.firstLogin / stageCounts.approved) * 100
            : 0,
        firstLoginToActive:
          stageCounts.firstLogin > 0
            ? (stageCounts.active / stageCounts.firstLogin) * 100
            : 0,
      };

      byLocale.push({
        locale,
        stageBreakdown,
        conversionRates: {
          visitorToTrialStart: Math.round(conversionRates.visitorToTrialStart * 100) / 100,
          trialStartToEngaged: Math.round(conversionRates.trialStartToEngaged * 100) / 100,
          engagedToLimitHit: Math.round(conversionRates.engagedToLimitHit * 100) / 100,
          limitHitToBetaRequest: Math.round(conversionRates.limitHitToBetaRequest * 100) / 100,
          betaRequestToApproved: Math.round(conversionRates.betaRequestToApproved * 100) / 100,
          approvedToFirstLogin: Math.round(conversionRates.approvedToFirstLogin * 100) / 100,
          firstLoginToActive: Math.round(conversionRates.firstLoginToActive * 100) / 100,
        },
        totalEvents: events.length,
        uniqueVisitors,
        uniqueUsers,
      });
    });

    // Sort by total events descending
    byLocale.sort((a, b) => b.totalEvents - a.totalEvents);

    // Top locales summary
    const topLocales = byLocale
      .slice(0, 10)
      .map((locale) => ({
        locale: locale.locale,
        events: locale.totalEvents,
        conversionToTrialStart: locale.conversionRates.visitorToTrialStart,
      }));

    const response: LocaleFunnelResponse = {
      summary: {
        totalLocales: localeMap.size,
        totalEvents: funnelEvents.length,
        periodStart: startDate.toISOString().split("T")[0],
        periodEnd: endDate.toISOString().split("T")[0],
      },
      byLocale,
      topLocales,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching locale-segmented funnel metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch locale funnel metrics" },
      { status: 500 },
    );
  }
}
