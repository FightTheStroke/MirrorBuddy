// ============================================================================
// API ROUTE: Prometheus Metrics
// GET: Export metrics in Prometheus format for Grafana integration
// https://prometheus.io/docs/instrumenting/exposition_formats/
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { metricsStore } from "@/lib/observability/metrics-store";
import { generateSLIMetrics } from "./sli-metrics";
import { generateBehavioralMetrics } from "./behavioral-metrics";
import { generateBusinessMetrics } from "./business-metrics";
import { generateSecurityMetrics } from "./security-metrics";
import { generateExternalServiceMetrics } from "@/lib/metrics/external-service-metrics";
import { getPoolMetrics, getPoolUtilization } from "@/lib/metrics/pool-metrics";

interface MetricLine {
  name: string;
  type: "counter" | "gauge" | "histogram";
  help: string;
  labels: Record<string, string>;
  value: number;
}

export const GET = pipe(withSentry("/api/metrics"))(async (_ctx) => {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // F-06: Exclude test data from all metrics
  // Fetch aggregated metrics from database
  const [
    totalUsers,
    activeUsersHour,
    activeUsersDay,
    sessionsHour,
    sessionsDay,
    eventCounts,
    errorCount,
    avgResponseTime,
  ] = await Promise.all([
    // Total users (F-06: exclude test data)
    prisma.user.count({
      where: { isTestData: false },
    }),

    // Active users in last hour (F-06: exclude test data)
    prisma.telemetryEvent
      .findMany({
        where: {
          timestamp: { gte: hourAgo },
          userId: { not: null },
          isTestData: false,
        },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),

    // Active users in last 24 hours (F-06: exclude test data)
    prisma.telemetryEvent
      .findMany({
        where: {
          timestamp: { gte: dayAgo },
          userId: { not: null },
          isTestData: false,
        },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),

    // Sessions in last hour (F-06: exclude test data)
    prisma.telemetryEvent.count({
      where: {
        category: "navigation",
        action: "session_started",
        timestamp: { gte: hourAgo },
        isTestData: false,
      },
    }),

    // Sessions in last 24 hours (F-06: exclude test data)
    prisma.telemetryEvent.count({
      where: {
        category: "navigation",
        action: "session_started",
        timestamp: { gte: dayAgo },
        isTestData: false,
      },
    }),

    // Event counts by category (last hour, F-06: exclude test data)
    prisma.telemetryEvent.groupBy({
      by: ["category"],
      where: { timestamp: { gte: hourAgo }, isTestData: false },
      _count: true,
    }),

    // Error count (last hour, F-06: exclude test data)
    prisma.telemetryEvent.count({
      where: {
        category: "error",
        timestamp: { gte: hourAgo },
        isTestData: false,
      },
    }),

    // Average API response time (last hour, F-06: exclude test data)
    prisma.telemetryEvent.aggregate({
      where: {
        category: "performance",
        action: "api_response",
        timestamp: { gte: hourAgo },
        isTestData: false,
      },
      _avg: { value: true },
    }),
  ]);

  // F-06: Fetch maestro usage metrics (exclude test data)
  const maestroUsage = await prisma.studySession.groupBy({
    by: ["maestroId"],
    where: { startedAt: { gte: dayAgo }, isTestData: false },
    _count: true,
  });

  // Build Prometheus metrics
  const metrics: MetricLine[] = [];

  // User metrics
  metrics.push({
    name: "mirrorbuddy_users_total",
    type: "gauge",
    help: "Total number of registered users",
    labels: {},
    value: totalUsers,
  });

  metrics.push({
    name: "mirrorbuddy_users_active",
    type: "gauge",
    help: "Number of active users",
    labels: { period: "1h" },
    value: activeUsersHour,
  });

  metrics.push({
    name: "mirrorbuddy_users_active",
    type: "gauge",
    help: "Number of active users",
    labels: { period: "24h" },
    value: activeUsersDay,
  });

  // Session metrics
  metrics.push({
    name: "mirrorbuddy_sessions_total",
    type: "counter",
    help: "Total number of sessions",
    labels: { period: "1h" },
    value: sessionsHour,
  });

  metrics.push({
    name: "mirrorbuddy_sessions_total",
    type: "counter",
    help: "Total number of sessions",
    labels: { period: "24h" },
    value: sessionsDay,
  });

  // Event metrics by category
  for (const cat of eventCounts) {
    metrics.push({
      name: "mirrorbuddy_events_total",
      type: "counter",
      help: "Total events by category",
      labels: { category: cat.category, period: "1h" },
      value: cat._count,
    });
  }

  // Error metrics
  metrics.push({
    name: "mirrorbuddy_errors_total",
    type: "counter",
    help: "Total number of errors",
    labels: { period: "1h" },
    value: errorCount,
  });

  // Performance metrics
  metrics.push({
    name: "mirrorbuddy_api_response_ms",
    type: "gauge",
    help: "Average API response time in milliseconds",
    labels: { period: "1h" },
    value: avgResponseTime._avg.value || 0,
  });

  // Maestro usage metrics
  for (const m of maestroUsage) {
    metrics.push({
      name: "mirrorbuddy_maestro_sessions",
      type: "counter",
      help: "Sessions by maestro",
      labels: { maestro_id: m.maestroId, period: "24h" },
      value: m._count,
    });
  }

  // SLI METRICS (F-02, F-03): Latency percentiles and error rates per route
  const metricsSummary = metricsStore.getMetricsSummary();
  const sliMetrics = generateSLIMetrics(metricsSummary);
  metrics.push(...sliMetrics);

  // BEHAVIORAL METRICS (V1Plan FASE 2): Session health, safety, cost
  const behavioralMetrics = await generateBehavioralMetrics();
  metrics.push(...behavioralMetrics);

  // BUSINESS METRICS: User engagement, conversion, retention, maestri usage
  const businessMetrics = await generateBusinessMetrics();
  metrics.push(...businessMetrics);

  // SECURITY METRICS: SSL status, env validation, security events
  const securityMetrics = await generateSecurityMetrics();
  metrics.push(...securityMetrics);

  // CONNECTION POOL METRICS (ADR 0067): Pool statistics and utilization
  const poolStats = getPoolMetrics();
  const poolUtilization = getPoolUtilization();

  metrics.push({
    name: "mirrorbuddy_db_pool_size_total",
    type: "gauge",
    help: "Total connection pool size (active + idle)",
    labels: {},
    value: poolStats.total,
  });

  metrics.push({
    name: "mirrorbuddy_db_pool_connections_active",
    type: "gauge",
    help: "Active database connections currently executing queries",
    labels: {},
    value: poolStats.active,
  });

  metrics.push({
    name: "mirrorbuddy_db_pool_connections_idle",
    type: "gauge",
    help: "Idle database connections available for reuse",
    labels: {},
    value: poolStats.idle,
  });

  metrics.push({
    name: "mirrorbuddy_db_pool_requests_waiting",
    type: "gauge",
    help: "Requests waiting for an available connection (pool exhausted if > 0)",
    labels: {},
    value: poolStats.waiting,
  });

  metrics.push({
    name: "mirrorbuddy_db_pool_utilization_percent",
    type: "gauge",
    help: "Connection pool utilization percentage (0-100)",
    labels: {},
    value: poolUtilization,
  });

  // Format as Prometheus exposition format
  const output = formatPrometheusOutput(metrics);

  // EXTERNAL SERVICE METRICS: Azure OpenAI, Google Drive, Brave Search quotas
  const externalServiceMetrics = await generateExternalServiceMetrics();
  const fullOutput = output + "\n" + externalServiceMetrics;

  return new NextResponse(fullOutput, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});

// ============================================================================
// PROMETHEUS FORMAT HELPERS
// ============================================================================

function formatPrometheusOutput(metrics: MetricLine[]): string {
  const lines: string[] = [];
  const seenMetrics = new Set<string>();

  // Group metrics by name to add HELP and TYPE only once
  for (const metric of metrics) {
    if (!seenMetrics.has(metric.name)) {
      seenMetrics.add(metric.name);
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
    }

    // Format labels
    const labelStr =
      Object.keys(metric.labels).length > 0
        ? `{${Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(",")}}`
        : "";

    lines.push(`${metric.name}${labelStr} ${metric.value}`);
  }

  // Add timestamp comment
  lines.push("");
  lines.push(`# Generated at ${new Date().toISOString()}`);

  return lines.join("\n");
}
