/**
 * Ops Dashboard Service
 *
 * Real-time metrics aggregation with 30-second caching.
 * Queries UserActivity, VoiceSession, and PostgreSQL stats.
 */

import { prisma } from "@/lib/db";
import type {
  OpsDashboardResponse,
  OnlineUsersMetric,
  RequestMetrics,
  VoiceMetrics,
  DatabaseMetrics,
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
  const [onlineUsers, requests, voice, database] = await Promise.all([
    getOnlineUsers(),
    getRequestMetrics(),
    getVoiceMetrics(),
    getDatabaseMetrics(),
  ]);

  const data: OpsDashboardResponse = {
    onlineUsers,
    requests,
    voice,
    database,
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
  // TODO: Implement real APM integration
  // For now, return mock data
  return {
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    topEndpoints: [],
  };
}

/**
 * Get voice session metrics
 * TODO: Implement when VoiceSession table is added
 */
async function getVoiceMetrics(): Promise<VoiceMetrics> {
  // VoiceSession table not yet implemented
  // Return placeholder data
  return {
    activeSessions: 0,
    totalMinutesToday: 0,
    avgDuration: 0,
  };
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
