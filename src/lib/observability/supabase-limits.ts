/**
 * Supabase Limits Monitoring
 *
 * Queries Supabase database and storage metrics for observability.
 * Used for real-time stress metrics (F-05) and automatic limit queries (F-22).
 *
 * Usage:
 *   import { getSupabaseLimits } from '@/lib/observability/supabase-limits';
 *   const limits = await getSupabaseLimits();
 *   console.log(limits.database.used, limits.connections.used);
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { calculateStatus, AlertStatus } from "./threshold-logic";

/**
 * Resource metrics with usage and limit (F-18, F-25)
 */
export interface ResourceMetric {
  used: number;
  limit: number;
  usagePercent: number;
  unit: string;
  status: AlertStatus; // Alert status from threshold logic
}

/**
 * Complete Supabase limits snapshot
 */
export interface SupabaseLimits {
  database: ResourceMetric;
  connections: ResourceMetric;
  storage: ResourceMetric | null;
  timestamp: string;
}

/**
 * Supabase Free Tier Limits (as of 2025)
 * Source: https://supabase.com/pricing
 */
const SUPABASE_FREE_LIMITS = {
  DATABASE_SIZE_MB: 500, // 500 MB
  MAX_CONNECTIONS: 60, // 60 concurrent connections
  STORAGE_GB: 1, // 1 GB
};

/**
 * Query current database size in bytes
 */
async function getDatabaseSize(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<[{ size: bigint }]>`
      SELECT pg_database_size(current_database()) AS size
    `;
    return Number(result[0].size);
  } catch (error) {
    logger.error(
      "[supabase-limits] Failed to query database size",
      undefined,
      error,
    );
    throw error;
  }
}

/**
 * Query current connection count
 */
async function getConnectionCount(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    return Number(result[0].count);
  } catch (error) {
    logger.error(
      "[supabase-limits] Failed to query connection count",
      undefined,
      error,
    );
    throw error;
  }
}

/**
 * Get storage usage (placeholder - requires Supabase Storage API)
 *
 * Note: Supabase storage metrics are not available via SQL.
 * This would require calling the Supabase Management API:
 * https://supabase.com/docs/reference/api/usage
 *
 * For now, returns null. Can be implemented when storage is needed.
 */
async function getStorageUsage(): Promise<number | null> {
  // TODO: Implement Supabase Storage API call when needed
  // Requires SUPABASE_SERVICE_ROLE_KEY and project ref
  return null;
}

/**
 * Format resource metric with usage percentage and status (F-25)
 */
function formatMetric(
  used: number,
  limit: number,
  unit: string,
): ResourceMetric {
  const usagePercent = limit > 0 ? Math.round((used / limit) * 100) : 0;
  return {
    used,
    limit,
    usagePercent,
    unit,
    status: calculateStatus(usagePercent), // F-25: Calculate alert status
  };
}

/**
 * Get complete Supabase limits snapshot (F-05, F-22)
 *
 * Returns current usage for database size, connections, and storage.
 *
 * @returns {Promise<SupabaseLimits>} Current limits and usage
 * @throws {Error} If database queries fail
 *
 * @example
 * ```typescript
 * const limits = await getSupabaseLimits();
 * if (limits.database.usagePercent > 80) {
 *   console.warn('Database usage critical:', limits.database.usagePercent);
 * }
 * ```
 */
export async function getSupabaseLimits(): Promise<SupabaseLimits> {
  try {
    const [dbSizeBytes, connectionCount, storageBytes] = await Promise.all([
      getDatabaseSize(),
      getConnectionCount(),
      getStorageUsage(),
    ]);

    const dbSizeMB = Math.round(dbSizeBytes / 1024 / 1024);

    return {
      database: formatMetric(
        dbSizeMB,
        SUPABASE_FREE_LIMITS.DATABASE_SIZE_MB,
        "MB",
      ),
      connections: formatMetric(
        connectionCount,
        SUPABASE_FREE_LIMITS.MAX_CONNECTIONS,
        "connections",
      ),
      storage:
        storageBytes !== null
          ? formatMetric(
              Math.round(storageBytes / 1024 / 1024 / 1024),
              SUPABASE_FREE_LIMITS.STORAGE_GB,
              "GB",
            )
          : null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("[supabase-limits] Failed to get limits", undefined, error);
    throw new Error("Failed to query Supabase limits");
  }
}

/**
 * Check if any resource is above threshold (F-05 stress detection)
 *
 * @param threshold - Percentage threshold (default: 80)
 * @returns {Promise<boolean>} True if any resource exceeds threshold
 */
export async function isResourceStressed(
  threshold: number = 80,
): Promise<boolean> {
  try {
    const limits = await getSupabaseLimits();
    return (
      limits.database.usagePercent >= threshold ||
      limits.connections.usagePercent >= threshold ||
      (limits.storage?.usagePercent ?? 0) >= threshold
    );
  } catch (error) {
    logger.error(
      "[supabase-limits] Failed to check resource stress",
      undefined,
      error,
    );
    return false; // Fail open - don't block on monitoring errors
  }
}

/**
 * Get human-readable stress report (F-05 visibility)
 *
 * @returns {Promise<string>} Formatted report of resource usage
 */
export async function getStressReport(): Promise<string> {
  try {
    const limits = await getSupabaseLimits();
    const lines = [
      `Database: ${limits.database.used}/${limits.database.limit} ${limits.database.unit} (${limits.database.usagePercent}%)`,
      `Connections: ${limits.connections.used}/${limits.connections.limit} ${limits.connections.unit} (${limits.connections.usagePercent}%)`,
    ];

    if (limits.storage) {
      lines.push(
        `Storage: ${limits.storage.used}/${limits.storage.limit} ${limits.storage.unit} (${limits.storage.usagePercent}%)`,
      );
    }

    return lines.join("\n");
  } catch (error) {
    return `Error fetching stress report: ${error}`;
  }
}
