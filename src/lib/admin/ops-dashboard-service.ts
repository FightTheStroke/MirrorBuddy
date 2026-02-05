/**
 * Ops Dashboard Service
 *
 * Real-time metrics aggregation with 30-second caching.
 * Queries UserActivity, VoiceSession, and PostgreSQL stats.
 */

import { prisma } from "@/lib/db";
import { getAllExternalServiceUsage } from "@/lib/metrics/external-service-metrics";
import type {
  OpsDashboardResponse,
  OnlineUsersMetric,
  RequestMetrics,
  VoiceMetrics,
  DatabaseMetrics,
  ServiceHealthItem,
  RecentIncident,
} from "./ops-dashboard-types";

// Cache for 30 seconds
let cachedData: OpsDashboardResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

/**
 * Get all ops dashboard data (cached)
 */
export async function getOpsDashboardData(): Promise<OpsDashboardResponse> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  // Fetch all metrics in parallel
  const [
    onlineUsers,
    requests,
    voice,
    database,
    serviceHealth,
    recentIncidents,
  ] = await Promise.all([
    getOnlineUsers(),
    getRequestMetrics(),
    getVoiceMetrics(),
    getDatabaseMetrics(),
    getServiceHealth(),
    getRecentIncidents(),
  ]);

  const data: OpsDashboardResponse = {
    onlineUsers,
    requests,
    voice,
    database,
    serviceHealth,
    recentIncidents,
    timestamp: new Date().toISOString(),
  };

  cachedData = data;
  cacheTimestamp = now;
  return data;
}

/**
 * Get online users (active in last 15 minutes)
 */
async function getOnlineUsers(): Promise<OnlineUsersMetric> {
  try {
    // Query UserActivity table for users active in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const activities = await prisma.userActivity.findMany({
      where: {
        timestamp: {
          gte: fifteenMinutesAgo,
        },
        isTestData: false,
      },
      select: {
        identifier: true,
        userType: true,
      },
    });

    // Get unique users (deduplicate by identifier)
    const uniqueUsers = new Map<string, string>();
    for (const activity of activities) {
      uniqueUsers.set(activity.identifier, activity.userType);
    }

    // Group by user type (logged, trial, anonymous)
    const typeMap = new Map<string, number>();
    for (const userType of uniqueUsers.values()) {
      typeMap.set(userType, (typeMap.get(userType) || 0) + 1);
    }

    return {
      total: uniqueUsers.size,
      byNation: [], // Nation data not available in UserActivity
      byTier: Array.from(typeMap.entries()).map(([tier, count]) => ({
        tier,
        count,
      })),
    };
  } catch (_error) {
    // If UserActivity table doesn't exist, return mock data
    return {
      total: 0,
      byNation: [],
      byTier: [],
    };
  }
}

/**
 * Get request metrics (mock data until APM is implemented)
 */
async function getRequestMetrics(): Promise<RequestMetrics> {
  // ENGINEERING JUSTIFICATION: APM integration deferred (ADR 0037).
  // Requires Grafana Cloud push service or custom APM setup.
  // Placeholder allows ops dashboard development without external dependency.
  return {
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    topEndpoints: [],
  };
}

/**
 * Get voice session metrics
 * ENGINEERING JUSTIFICATION: VoiceSession table not yet implemented in schema.
 * Voice metrics tracked via UserActivity for now. Dedicated table planned
 * for detailed session analytics (duration, interruptions, quality metrics).
 * Placeholder prevents ops dashboard errors while schema evolves.
 */
async function getVoiceMetrics(): Promise<VoiceMetrics> {
  // Return placeholder data until VoiceSession table is added
  return {
    activeSessions: 0,
    totalMinutesToday: 0,
    avgDuration: 0,
  };
}

/**
 * Get external service health (quota usage)
 */
async function getServiceHealth(): Promise<ServiceHealthItem[]> {
  try {
    const usage = await getAllExternalServiceUsage();
    return usage.map((u) => ({
      service: u.service,
      metric: u.metric,
      usagePercent: u.usagePercent,
      status: u.status,
      period: u.period,
    }));
  } catch (_error) {
    return [];
  }
}

/**
 * Get recent incidents from telemetry (last 24h)
 */
async function getRecentIncidents(): Promise<RecentIncident[]> {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await prisma.telemetryEvent.findMany({
      where: {
        timestamp: { gte: dayAgo },
        category: {
          in: ["safety_incident", "external_api", "circuit_breaker"],
        },
      },
      orderBy: { timestamp: "desc" },
      take: 20,
      select: {
        eventId: true,
        timestamp: true,
        category: true,
        action: true,
        label: true,
      },
    });

    return events.map((e) => ({
      id: e.eventId,
      timestamp: e.timestamp.toISOString(),
      category: e.category,
      action: e.action,
      label: e.label || "",
      severity: getSeverity(e.category, e.action),
    }));
  } catch (_error) {
    return [];
  }
}

function getSeverity(
  category: string,
  action: string,
): "info" | "warning" | "critical" {
  if (category === "safety_incident") return "critical";
  if (category === "circuit_breaker") return "warning";
  if (action.includes("error") || action.includes("fail")) return "warning";
  return "info";
}

/**
 * Get database metrics from PostgreSQL
 */
async function getDatabaseMetrics(): Promise<DatabaseMetrics> {
  try {
    // Query pg_stat_activity for active connections
    const connections = (await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      AND state = 'active'
    `) as { count: bigint }[];

    const activeConnections = Number(connections[0]?.count || 0);

    // Query pg_database_size
    const dbSize = (await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as size
    `) as { size: bigint }[];

    const sizeBytes = Number(dbSize[0]?.size || 0);
    const sizeMB = sizeBytes / (1024 * 1024);

    // Get query stats (if available)
    const queryCount = 0;
    const avgQueryTime = 0;

    return {
      activeConnections,
      queryCount,
      avgQueryTime,
      tableSize: Math.round(sizeMB * 100) / 100,
    };
  } catch (_error) {
    // If query fails, return fallback metrics
    return {
      activeConnections: 0,
      queryCount: 0,
      avgQueryTime: 0,
      tableSize: 0,
    };
  }
}
