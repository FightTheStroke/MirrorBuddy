/**
 * Supabase Metrics Provider
 * Fetches database metrics using Prisma queries
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { SupabaseMetrics } from "./infra-panel-types";

/**
 * Get Supabase metrics from database
 * Returns null if database queries fail
 */
export async function getSupabaseMetrics(): Promise<SupabaseMetrics | null> {
  try {
    // Get database size
    const sizeResult = await prisma.$queryRaw<{ size: bigint }[]>`
      SELECT pg_database_size(current_database()) as size
    `;
    const databaseSize = Number(sizeResult[0]?.size || 0);

    // Get active connections
    const connectionsResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;
    const connections = Number(connectionsResult[0]?.count || 0);

    // Get approximate row count from all user tables
    const rowCountResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT sum(n_live_tup) as total
      FROM pg_stat_user_tables
    `;
    const rowCount = Number(rowCountResult[0]?.total || 0);

    return {
      databaseSize,
      connections,
      storageUsed: databaseSize, // Approximate
      rowCount,
      status: connections < 50 ? "healthy" : "degraded",
    };
  } catch (error) {
    logger.error("Error fetching Supabase metrics", { error: String(error) });
    return null;
  }
}
