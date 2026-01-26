/**
 * Sentry Usage Statistics API Endpoint
 *
 * Fetches quota usage from Sentry for admin dashboard.
 * Shows events consumed vs free tier limit (5,000/month).
 *
 * Requires SENTRY_AUTH_TOKEN, SENTRY_ORG env vars.
 */

import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { logger } from "@/lib/logger";

const SENTRY_API_BASE = "https://sentry.io/api/0";

// Sentry Free Tier (Developer plan) limit
const FREE_TIER_EVENTS_MONTHLY = 5000;

interface SentryStatsResponse {
  eventsConsumed: number;
  eventsLimit: number;
  percentUsed: number;
  periodStart: string;
  periodEnd: string;
  isFreeTier: boolean;
  warningThreshold: number; // 80% default
  criticalThreshold: number; // 95% default
  recommendation: string | null;
}

export async function GET() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;

  if (!authToken || !org) {
    return NextResponse.json(
      {
        error: "Sentry not configured",
        eventsConsumed: 0,
        eventsLimit: FREE_TIER_EVENTS_MONTHLY,
        percentUsed: 0,
        periodStart: "",
        periodEnd: "",
        isFreeTier: true,
        warningThreshold: 80,
        criticalThreshold: 95,
        recommendation: "Configure SENTRY_AUTH_TOKEN and SENTRY_ORG",
      },
      { status: 200 },
    );
  }

  try {
    // Get current billing period stats
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const statsUrl = `${SENTRY_API_BASE}/organizations/${org}/stats_v2/?field=sum(quantity)&category=error&interval=1d&statsPeriod=30d`;

    const response = await fetch(statsUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      // Fallback: try to get issue count as proxy
      const issuesUrl = `${SENTRY_API_BASE}/organizations/${org}/issues/?query=firstSeen:>=${periodStart.toISOString().split("T")[0]}&limit=1`;
      const issuesResponse = await fetch(issuesUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (issuesResponse.ok) {
        // Get total from X-Hits header if available
        const totalHits = issuesResponse.headers.get("X-Hits");
        const eventsConsumed = totalHits ? parseInt(totalHits, 10) : 0;

        return buildResponse(eventsConsumed, periodStart, periodEnd);
      }

      logger.warn("Sentry stats API error, returning defaults", {
        component: "sentry-stats",
        status: response.status,
      });

      return buildResponse(0, periodStart, periodEnd, "Unable to fetch stats");
    }

    const data = await response.json();

    // Sum up all quantities from the response
    let eventsConsumed = 0;
    if (data.groups && Array.isArray(data.groups)) {
      for (const group of data.groups) {
        if (group.totals && group.totals["sum(quantity)"]) {
          eventsConsumed += group.totals["sum(quantity)"];
        }
      }
    }

    return buildResponse(eventsConsumed, periodStart, periodEnd);
  } catch (error) {
    logger.error(
      "Sentry stats request failed",
      { component: "sentry-stats" },
      error,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch Sentry stats",
        eventsConsumed: 0,
        eventsLimit: FREE_TIER_EVENTS_MONTHLY,
        percentUsed: 0,
        periodStart: "",
        periodEnd: "",
        isFreeTier: true,
        warningThreshold: 80,
        criticalThreshold: 95,
        recommendation: null,
      },
      { status: 200 },
    );
  }
}

function buildResponse(
  eventsConsumed: number,
  periodStart: Date,
  periodEnd: Date,
  errorMsg?: string,
): NextResponse {
  const percentUsed = Math.round(
    (eventsConsumed / FREE_TIER_EVENTS_MONTHLY) * 100,
  );

  let recommendation: string | null = null;

  if (errorMsg) {
    recommendation = errorMsg;
  } else if (percentUsed >= 95) {
    recommendation =
      "CRITICAL: Consider upgrading Sentry plan or disabling warnings";
  } else if (percentUsed >= 80) {
    recommendation =
      "WARNING: Approaching quota limit, consider reducing warnings";
  } else if (percentUsed >= 50) {
    recommendation = "Usage is moderate, monitor regularly";
  }

  const result: SentryStatsResponse = {
    eventsConsumed,
    eventsLimit: FREE_TIER_EVENTS_MONTHLY,
    percentUsed,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    isFreeTier: true,
    warningThreshold: 80,
    criticalThreshold: 95,
    recommendation,
  };

  return NextResponse.json(result);
}
