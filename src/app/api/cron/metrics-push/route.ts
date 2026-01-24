/**
 * Metrics Push Cron Job Handler (Every 5 Minutes)
 * Pushes metrics to Grafana Cloud including:
 * - HTTP/SLI metrics (latency, error rates)
 * - Real-time active users
 * - Funnel and churn metrics
 * - Session health metrics (success rate, dropoff rate) - for Grafana alerts
 *
 * Scheduled via Vercel Cron: every 5 minutes
 * Required env vars:
 *   - GRAFANA_CLOUD_PROMETHEUS_URL
 *   - GRAFANA_CLOUD_PROMETHEUS_USER
 *   - GRAFANA_CLOUD_API_KEY
 *   - CRON_SECRET (for authentication)
 *
 * F-05b: All operational metrics collected every 5 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { metricsStore } from "@/lib/observability/metrics-store";
import { generateSLIMetrics } from "@/app/api/metrics/sli-metrics";
import { generateBehavioralMetrics } from "@/app/api/metrics/behavioral-metrics";

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

  // 3. Funnel metrics (Plan 069, F-10)
  try {
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Get counts per stage
    const stageCounts = await prisma.funnelEvent.groupBy({
      by: ["stage"],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        isTestData: false,
      },
      _count: { _all: true },
    });

    for (const sc of stageCounts) {
      samples.push({
        name: "mirrorbuddy_funnel_stage_count",
        labels: { ...instanceLabels, stage: sc.stage },
        value: sc._count._all,
        timestamp: now,
      });
    }

    // Calculate conversion rates between stages
    const stageOrder = [
      "VISITOR",
      "TRIAL_START",
      "TRIAL_ENGAGED",
      "LIMIT_HIT",
      "BETA_REQUEST",
      "APPROVED",
      "FIRST_LOGIN",
      "ACTIVE",
    ];
    const countMap = new Map(stageCounts.map((s) => [s.stage, s._count._all]));

    for (let i = 1; i < stageOrder.length; i++) {
      const prevCount = countMap.get(stageOrder[i - 1]) ?? 0;
      const currCount = countMap.get(stageOrder[i]) ?? 0;
      const rate = prevCount > 0 ? currCount / prevCount : 0;

      samples.push({
        name: "mirrorbuddy_funnel_conversion_rate",
        labels: {
          ...instanceLabels,
          from_stage: stageOrder[i - 1],
          to_stage: stageOrder[i],
        },
        value: rate,
        timestamp: now,
      });
    }

    // Overall funnel conversion (VISITOR → ACTIVE)
    const visitorCount = countMap.get("VISITOR") ?? 0;
    const activeCount = countMap.get("ACTIVE") ?? 0;
    samples.push({
      name: "mirrorbuddy_funnel_overall_conversion",
      labels: instanceLabels,
      value: visitorCount > 0 ? activeCount / visitorCount : 0,
      timestamp: now,
    });

    log.debug("Collected funnel metrics", { stages: stageCounts.length });
  } catch (err) {
    log.warn("Failed to collect funnel metrics", { error: String(err) });
  }

  // 4. Churn metrics (Plan 069)
  try {
    const churnCutoff = new Date(now - 14 * 24 * 60 * 60 * 1000); // 14 days

    // Get latest stage per user to determine churn
    const latestStages = await prisma.$queryRaw<
      Array<{ stage: string; last_activity: Date; is_churned: boolean }>
    >`
      WITH latest AS (
        SELECT
          COALESCE("visitorId", "userId") as user_key,
          stage,
          MAX("createdAt") as last_activity
        FROM "FunnelEvent"
        WHERE "isTestData" = false
        GROUP BY COALESCE("visitorId", "userId"), stage
        HAVING MAX("createdAt") = (
          SELECT MAX(fe2."createdAt")
          FROM "FunnelEvent" fe2
          WHERE COALESCE(fe2."visitorId", fe2."userId") = COALESCE("FunnelEvent"."visitorId", "FunnelEvent"."userId")
        )
      )
      SELECT
        stage,
        last_activity,
        (last_activity < ${churnCutoff} AND stage NOT IN ('ACTIVE', 'FIRST_LOGIN')) as is_churned
      FROM latest
    `;

    const totalUsers = latestStages.length;
    const churnedUsers = latestStages.filter((u) => u.is_churned).length;
    const churnRate = totalUsers > 0 ? churnedUsers / totalUsers : 0;

    samples.push(
      {
        name: "mirrorbuddy_funnel_total_users",
        labels: instanceLabels,
        value: totalUsers,
        timestamp: now,
      },
      {
        name: "mirrorbuddy_funnel_churned_users",
        labels: instanceLabels,
        value: churnedUsers,
        timestamp: now,
      },
      {
        name: "mirrorbuddy_funnel_churn_rate",
        labels: instanceLabels,
        value: churnRate,
        timestamp: now,
      },
    );

    // Churn by stage
    const churnByStage = new Map<string, { total: number; churned: number }>();
    for (const user of latestStages) {
      if (!churnByStage.has(user.stage)) {
        churnByStage.set(user.stage, { total: 0, churned: 0 });
      }
      const data = churnByStage.get(user.stage)!;
      data.total++;
      if (user.is_churned) data.churned++;
    }

    for (const [stage, data] of churnByStage) {
      samples.push({
        name: "mirrorbuddy_funnel_stage_churn_rate",
        labels: { ...instanceLabels, stage },
        value: data.total > 0 ? data.churned / data.total : 0,
        timestamp: now,
      });
    }

    log.debug("Collected churn metrics", { totalUsers, churnedUsers });
  } catch (err) {
    log.warn("Failed to collect churn metrics", { error: String(err) });
  }

  // 5. Session health metrics (behavioral) - for Grafana alerts
  try {
    const behavioralMetrics = await generateBehavioralMetrics();
    for (const m of behavioralMetrics) {
      samples.push({
        name: m.name,
        labels: { ...m.labels, ...instanceLabels },
        value: m.value,
        timestamp: now,
      });
    }
    log.debug("Collected behavioral metrics", {
      count: behavioralMetrics.length,
    });
  } catch (err) {
    log.warn("Failed to collect behavioral metrics", { error: String(err) });
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
    // Skip cron in non-production environments (staging/preview)
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
      log.info(
        `[CRON] Skipping metrics-push - not production (env: ${process.env.VERCEL_ENV})`,
      );
      return NextResponse.json(
        {
          skipped: true,
          reason: "Not production environment",
          environment: process.env.VERCEL_ENV,
        },
        { status: 200 },
      );
    }

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
  // Verify cron secret for production security
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized - invalid or missing CRON_SECRET" },
      { status: 401 },
    );
  }
  return POST(request);
}
