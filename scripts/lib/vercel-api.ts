/**
 * Vercel API integration for fetching and parsing metrics
 */

export interface RouteMetrics {
  invocations: number;
  p75_duration_s: number;
  error_rate: number;
  estimated_cost_usd?: number;
}

/**
 * Fetch metrics from Vercel API
 * Requires VERCEL_TOKEN environment variable
 */
export async function fetchVercelMetrics(): Promise<
  Record<string, RouteMetrics>
> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    console.warn(
      "VERCEL_TOKEN not set. Using mock baseline data for development.",
    );
    return getMockBaselineData();
  }

  try {
    // Get Vercel project ID from VERCEL_PROJECT_ID or default
    const projectId = process.env.VERCEL_PROJECT_ID || "mirrorbuddy";
    const teamId = process.env.VERCEL_TEAM_ID;

    // Fetch analytics from Vercel API
    const url = new URL("https://api.vercel.com/v1/analytics");
    url.searchParams.set("projectId", projectId);
    if (teamId) url.searchParams.set("teamId", teamId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(
        `Vercel API error (${response.status}). Using mock baseline data.`,
      );
      return getMockBaselineData();
    }

    const data = await response.json();
    return parseVercelAnalytics(data);
  } catch (error) {
    console.warn("Error fetching Vercel metrics:", error);
    return getMockBaselineData();
  }
}

/**
 * Parse Vercel analytics response to extract route metrics
 */
function parseVercelAnalytics(
  data: Record<string, unknown>,
): Record<string, RouteMetrics> {
  const routes: Record<string, RouteMetrics> = {};

  if (Array.isArray(data)) {
    data.forEach((route: Record<string, unknown>) => {
      if (route.path && typeof route.path === "string") {
        routes[route.path] = {
          invocations: Number(route.invocations) || 0,
          p75_duration_s: Number(route.p75) || 0,
          error_rate: Number(route.errorRate) || 0,
          estimated_cost_usd: calculateRouteCost(
            Number(route.invocations) || 0,
          ),
        };
      }
    });
  }

  if (Object.keys(routes).length === 0) {
    return getMockBaselineData();
  }

  return routes;
}

/**
 * Calculate estimated cost per route
 * Vercel pricing: $0.40 per 1M invocations
 */
function calculateRouteCost(invocations: number): number {
  const costPerMillion = 0.4;
  return (invocations / 1_000_000) * costPerMillion;
}

/**
 * Get mock baseline data from latest Vercel dashboard metrics
 * Used when VERCEL_TOKEN is not available
 */
function getMockBaselineData(): Record<string, RouteMetrics> {
  return {
    "/api/admin/counts": {
      invocations: 306,
      p75_duration_s: 18,
      error_rate: 0,
      estimated_cost_usd: 0.0001224,
    },
    "/api/cron/metrics-push": {
      invocations: 777,
      p75_duration_s: 12,
      error_rate: 0,
      estimated_cost_usd: 0.0003108,
    },
    "/api/conversations": {
      invocations: 83,
      p75_duration_s: 10,
      error_rate: 0,
      estimated_cost_usd: 0.0000332,
    },
    "/api/user": {
      invocations: 51,
      p75_duration_s: 19,
      error_rate: 0,
      estimated_cost_usd: 0.0000204,
    },
    "/api/telemetry/activity": {
      invocations: 60,
      p75_duration_s: 16,
      error_rate: 0,
      estimated_cost_usd: 0.000024,
    },
    "/welcome": {
      invocations: 78,
      p75_duration_s: 13,
      error_rate: 0,
      estimated_cost_usd: 0.0000312,
    },
    "/api/onboarding": {
      invocations: 45,
      p75_duration_s: 11,
      error_rate: 0,
      estimated_cost_usd: 0.000018,
    },
    "/api/realtime/token": {
      invocations: 123,
      p75_duration_s: 8,
      error_rate: 0,
      estimated_cost_usd: 0.0000492,
    },
    "/api/user/accessibility": {
      invocations: 34,
      p75_duration_s: 9,
      error_rate: 0,
      estimated_cost_usd: 0.0000136,
    },
    "/": {
      invocations: 156,
      p75_duration_s: 7,
      error_rate: 0,
      estimated_cost_usd: 0.0000624,
    },
  };
}

/**
 * Calculate totals from route metrics
 */
export function calculateTotals(routes: Record<string, RouteMetrics>): {
  invocations_per_day: number;
  estimated_cpu_seconds: number;
  estimated_daily_cost_usd: number;
} {
  const totalInvocations = Object.values(routes).reduce(
    (sum, route) => sum + route.invocations,
    0,
  );

  const totalCpuSeconds = Object.values(routes).reduce((sum, route) => {
    return sum + (route.p75_duration_s * route.invocations) / 1000;
  }, 0);

  const totalDailyCost = Object.values(routes).reduce(
    (sum, route) => sum + (route.estimated_cost_usd || 0),
    0,
  );

  return {
    invocations_per_day: totalInvocations,
    estimated_cpu_seconds: Math.round(totalCpuSeconds * 100) / 100,
    estimated_daily_cost_usd: Math.round(totalDailyCost * 100000) / 100000,
  };
}
