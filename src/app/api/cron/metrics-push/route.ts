/**
 * Metrics Push Cron Job Handler (Every 5 Minutes)
 * Pushes LIGHT metrics (HTTP/SLI + real-time active users) to Grafana Cloud
 *
 * Scheduled via Vercel Cron: every 5 minutes
 * Required env vars:
 *   - GRAFANA_CLOUD_PROMETHEUS_URL
 *   - GRAFANA_CLOUD_PROMETHEUS_USER
 *   - GRAFANA_CLOUD_API_KEY
 *   - CRON_SECRET (for authentication)
 *
 * F-05b: HTTP/SLI metrics collected every 5 minutes
 * Note: Heavy metrics (business + behavioral) are handled by business-metrics-daily cron
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { metricsStore } from "@/lib/observability/metrics-store";
import { generateSLIMetrics } from "@/app/api/metrics/sli-metrics";

const ACTIVITY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const log = logger.child({ module: "cron-metrics-push" });

interface PushResponse {
  status: "success" | "skipped" | "error";
  timestamp: string;
  duration_ms: number;
  metrics_pushed?: number;
  error?: string;
}

interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

/**
 * Verify cron request authenticity via CRON_SECRET header
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.warn("CRON_SECRET not configured - allowing all requests");
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const expectedHeader = `Bearer ${cronSecret}`;

  if (!authHeader || authHeader !== expectedHeader) {
    return false;
  }

  return true;
}

/**
 * Collect light metrics samples for push (HTTP/SLI + real-time active users)
 */
async function collectLightMetrics(): Promise<MetricSample[]> {
  const samples: MetricSample[] = [];
  const now = Date.now();

  const env =
    process.env.NODE_ENV === "production" ? "production" : "development";
  const instanceLabels = { instance: "mirrorbuddy", env };

  // 1. HTTP/SLI metrics from metrics store
  const summary = metricsStore.getMetricsSummary();
  const sliMetrics = generateSLIMetrics(summary);

  for (const m of sliMetrics) {
    samples.push({
      name: m.name,
      labels: { ...m.labels, env },
      value: m.value,
      timestamp: now,
    });
  }

  // Route-level metrics
  for (const [route, metrics] of Object.entries(summary.routes)) {
    const routeLabels = { ...instanceLabels, route };
    samples.push(
      {
        name: "http_requests_total",
        labels: routeLabels,
        value: metrics.count,
        timestamp: now,
      },
      {
        name: "http_request_duration_seconds",
        labels: { ...routeLabels, quantile: "0.95" },
        value: metrics.p95LatencyMs / 1000,
        timestamp: now,
      },
      {
        name: "http_request_error_rate",
        labels: routeLabels,
        value: metrics.errorRate,
        timestamp: now,
      },
    );
  }

  // 2. Real-time active users (from database - serverless safe)
  try {
    const windowStart = new Date(now - ACTIVITY_WINDOW_MS);

    // Get unique user count per type (F-06: exclude test data via isTestData flag)
    const uniqueByType = await prisma.$queryRaw<
      Array<{ userType: string; count: bigint }>
    >`
      SELECT "userType", COUNT(DISTINCT identifier) as count
      FROM "UserActivity"
      WHERE timestamp >= ${windowStart}
        AND "isTestData" = false
      GROUP BY "userType"
    `;

    const counts: Record<string, number> = {
      logged: 0,
      trial: 0,
      anonymous: 0,
    };

    for (const row of uniqueByType) {
      counts[row.userType] = Number(row.count);
    }

    const total = counts.logged + counts.trial + counts.anonymous;

    // Total active users by type
    samples.push(
      {
        name: "mirrorbuddy_realtime_active_users",
        labels: { ...instanceLabels, user_type: "total" },
        value: total,
        timestamp: now,
      },
      {
        name: "mirrorbuddy_realtime_active_users",
        labels: { ...instanceLabels, user_type: "logged" },
        value: counts.logged,
        timestamp: now,
      },
      {
        name: "mirrorbuddy_realtime_active_users",
        labels: { ...instanceLabels, user_type: "trial" },
        value: counts.trial,
        timestamp: now,
      },
      {
        name: "mirrorbuddy_realtime_active_users",
        labels: { ...instanceLabels, user_type: "anonymous" },
        value: counts.anonymous,
        timestamp: now,
      },
    );

    // F-06: Dedicated trial session metrics
    samples.push(
      {
        name: "mirrorbuddy_trial_sessions_active",
        labels: instanceLabels,
        value: counts.trial,
        timestamp: now,
      },
      {
        name: "mirrorbuddy_trial_to_total_ratio",
        labels: instanceLabels,
        value: total > 0 ? counts.trial / total : 0,
        timestamp: now,
      },
    );

    // Active users by route (top 10, F-06: exclude test data via isTestData flag)
    const routeCounts = await prisma.$queryRaw<
      Array<{ route: string; count: bigint }>
    >`
      SELECT route, COUNT(DISTINCT identifier) as count
      FROM "UserActivity"
      WHERE timestamp >= ${windowStart}
        AND "isTestData" = false
      GROUP BY route
      ORDER BY count DESC
      LIMIT 10
    `;

    for (const row of routeCounts) {
      samples.push({
        name: "mirrorbuddy_realtime_active_users_by_route",
        labels: { ...instanceLabels, route: row.route },
        value: Number(row.count),
        timestamp: now,
      });
    }

    log.debug("Collected realtime active users from database", {
      total,
      logged: counts.logged,
      trial: counts.trial,
    });

    // Cleanup old records (older than 10 minutes to be safe)
    const cleanupCutoff = new Date(now - ACTIVITY_WINDOW_MS * 2);
    await prisma.userActivity.deleteMany({
      where: { timestamp: { lt: cleanupCutoff } },
    });
  } catch (err) {
    log.warn("Failed to collect realtime active users", {
      error: String(err),
    });
  }

  return samples;
}

/**
 * Format samples as Influx Line Protocol
 */
function formatInfluxLineProtocol(samples: MetricSample[]): string {
  return samples
    .map((s) => {
      const tags = Object.entries(s.labels)
        .map(([k, v]) => `${k}=${v.replace(/[\\,= ]/g, "\\$&")}`)
        .join(",");
      return `${s.name},${tags} value=${s.value} ${s.timestamp * 1000000}`;
    })
    .join("\n");
}

/**
 * Push metrics to Grafana Cloud
 */
async function pushToGrafana(samples: MetricSample[]): Promise<void> {
  const url = process.env.GRAFANA_CLOUD_PROMETHEUS_URL;
  const user = process.env.GRAFANA_CLOUD_PROMETHEUS_USER;
  const apiKey = process.env.GRAFANA_CLOUD_API_KEY;

  if (!url || !user || !apiKey) {
    throw new Error(
      "Grafana Cloud config incomplete (missing URL, USER, or API_KEY)",
    );
  }

  const body = formatInfluxLineProtocol(samples);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      Authorization: `Basic ${Buffer.from(`${user}:${apiKey}`).toString("base64")}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push failed: ${response.status} ${text}`);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const response: PushResponse = {
    status: "success",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
  };

  try {
    // Verify cron authenticity
    if (!verifyCronSecret(request)) {
      log.error("Invalid CRON_SECRET provided");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Grafana Cloud is configured
    if (!process.env.GRAFANA_CLOUD_PROMETHEUS_URL) {
      response.status = "skipped";
      response.duration_ms = Date.now() - startTime;
      log.info("Metrics push skipped (Grafana Cloud not configured)");
      return NextResponse.json(response, { status: 200 });
    }

    // Collect and push light metrics (HTTP/SLI + real-time active users)
    const samples = await collectLightMetrics();

    if (samples.length === 0) {
      response.status = "skipped";
      response.duration_ms = Date.now() - startTime;
      log.info("No metrics to push");
      return NextResponse.json(response, { status: 200 });
    }

    await pushToGrafana(samples);

    response.metrics_pushed = samples.length;
    response.duration_ms = Date.now() - startTime;

    log.info("Metrics pushed to Grafana Cloud", {
      metrics_count: samples.length,
      duration_ms: response.duration_ms,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    response.status = "error";
    response.duration_ms = Date.now() - startTime;
    response.error = error instanceof Error ? error.message : String(error);

    log.error("Metrics push failed", {
      error: response.error,
      duration_ms: response.duration_ms,
    });

    return NextResponse.json(response, { status: 500 });
  }
}

// Vercel Cron uses GET by default
export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
