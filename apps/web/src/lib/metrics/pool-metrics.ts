// ============================================================================
// CONNECTION POOL METRICS
// Prometheus metrics for PostgreSQL connection pool monitoring
// ADR 0067: Database Performance Optimization
// ============================================================================

import { dbPool } from "@/lib/db";

export interface PoolMetrics {
  total: number; // Total pool size (max)
  active: number; // Active connections (in use)
  idle: number; // Idle connections (available)
  waiting: number; // Requests waiting for a connection
}

/**
 * Get current connection pool statistics
 *
 * Metrics exposed:
 * - mirrorbuddy_db_pool_total: Maximum pool size (configured)
 * - mirrorbuddy_db_pool_active: Active connections currently executing queries
 * - mirrorbuddy_db_pool_idle: Idle connections available for reuse
 * - mirrorbuddy_db_pool_waiting: Requests waiting for an available connection
 *
 * Monitoring:
 * - Alert if active >= 80% of total (approaching exhaustion)
 * - Alert if waiting > 0 (connection pool exhausted)
 * - Track idle to optimize min pool size
 */
export function getPoolMetrics(): PoolMetrics {
  // pg.Pool exposes these properties for monitoring
  // Reference: https://node-postgres.com/apis/pool
  const total = dbPool.totalCount; // Total connections (active + idle)
  const idle = dbPool.idleCount; // Idle connections waiting to be used
  const waiting = dbPool.waitingCount; // Clients waiting for a connection

  // Active = total - idle (connections currently executing queries)
  const active = total - idle;

  return {
    total,
    active,
    idle,
    waiting,
  };
}

/**
 * Get pool utilization percentage (0-100)
 *
 * Formula: (active / max) * 100
 *
 * Thresholds:
 * - < 50%: Healthy (normal operation)
 * - 50-79%: Warning (monitor closely)
 * - >= 80%: Critical (pool approaching exhaustion)
 */
export function getPoolUtilization(): number {
  const stats = getPoolMetrics();
  const maxSize = 5; // From ADR 0067: max: 5 for serverless

  return Math.round((stats.active / maxSize) * 100);
}

/**
 * Check if pool is healthy
 *
 * Criteria:
 * - No waiting requests (pool not exhausted)
 * - Utilization < 80% (headroom available)
 * - Active connections < max (not at limit)
 */
export function isPoolHealthy(): boolean {
  const stats = getPoolMetrics();
  const utilization = getPoolUtilization();

  return stats.waiting === 0 && utilization < 80;
}

/**
 * Get pool health status and message
 */
export function getPoolHealthStatus(): {
  status: "healthy" | "warning" | "critical";
  message: string;
  utilization: number;
} {
  const stats = getPoolMetrics();
  const utilization = getPoolUtilization();

  // Critical: Pool exhausted (requests waiting)
  if (stats.waiting > 0) {
    return {
      status: "critical",
      message: `Pool exhausted: ${stats.waiting} request(s) waiting`,
      utilization,
    };
  }

  // Critical: Very high utilization (≥90%)
  if (utilization >= 90) {
    return {
      status: "critical",
      message: `Very high utilization: ${utilization}%`,
      utilization,
    };
  }

  // Warning: High utilization (≥80%)
  if (utilization >= 80) {
    return {
      status: "warning",
      message: `High utilization: ${utilization}%`,
      utilization,
    };
  }

  // Warning: Moderate utilization (≥50%)
  if (utilization >= 50) {
    return {
      status: "warning",
      message: `Moderate utilization: ${utilization}%`,
      utilization,
    };
  }

  // Healthy: Normal operation
  return {
    status: "healthy",
    message: `Normal operation: ${utilization}% utilization`,
    utilization,
  };
}
