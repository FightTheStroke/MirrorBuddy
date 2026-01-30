/**
 * Ops Dashboard Types
 *
 * Type definitions for real-time operations dashboard.
 * Used for monitoring users online, requests, voice sessions, and database metrics.
 */

/**
 * User activity metric grouped by nation
 */
export interface UserActivityMetric {
  nation: string;
  tier: string;
  count: number;
}

/**
 * Online users aggregated metrics
 */
export interface OnlineUsersMetric {
  total: number;
  byNation: {
    nation: string;
    count: number;
  }[];
  byTier: {
    tier: string;
    count: number;
  }[];
}

/**
 * HTTP request metrics
 */
export interface RequestMetrics {
  totalRequests: number;
  avgResponseTime: number; // ms
  errorRate: number; // percentage (0-100)
  topEndpoints: {
    path: string;
    count: number;
    avgTime: number;
  }[];
}

/**
 * Voice session metrics
 */
export interface VoiceMetrics {
  activeSessions: number;
  totalMinutesToday: number;
  avgDuration: number; // seconds
}

/**
 * Database performance metrics
 */
export interface DatabaseMetrics {
  activeConnections: number;
  queryCount: number;
  avgQueryTime: number; // ms
  tableSize: number; // MB
}

/**
 * Admin API response for ops dashboard
 */
export interface OpsDashboardResponse {
  onlineUsers: OnlineUsersMetric;
  requests: RequestMetrics;
  voice: VoiceMetrics;
  database: DatabaseMetrics;
  timestamp: string; // ISO datetime
}
