/**
 * Daily Business Metrics Cron Job (3 AM UTC)
 * Collects and pushes heavy business & behavioral metrics to Grafana Cloud
 *
 * Scheduled via Vercel Cron: 0 3 * * * (3 AM daily)
 * Required env vars:
 *   - GRAFANA_CLOUD_PROMETHEUS_URL
 *   - GRAFANA_CLOUD_PROMETHEUS_USER
 *   - GRAFANA_CLOUD_API_KEY
 *   - CRON_SECRET (for authentication)
 *
 * F-05a: Business/behavioral metrics collected and pushed daily at 3 AM
 */

import { pipe, withSentry, withCron } from "@/lib/api/middlewares";
import { logger } from "@/lib/logger";
import { generateBusinessMetrics } from "@/app/api/metrics/business-metrics";
import { generateBehavioralMetrics } from "@/app/api/metrics/behavioral-metrics";

const log = logger.child({ module: "cron-business-metrics-daily" });

interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

interface CronResponse {
  status: "success" | "skipped" | "error";
  timestamp: string;
  duration_ms: number;
  business_metrics?: number;
  behavioral_metrics?: number;
  error?: string;
}

/**
 * Format samples as Influx Line Protocol for Grafana Cloud push
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
 * Push metrics to Grafana Cloud via Prometheus remote write endpoint
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

/**
 * Collect business and behavioral metrics for daily reporting
 */
async function collectDailyMetrics(): Promise<{
  samples: MetricSample[];
  businessCount: number;
  behavioralCount: number;
}> {
  const samples: MetricSample[] = [];
  const now = Date.now();
  const env =
    process.env.NODE_ENV === "production" ? "production" : "development";
  const instanceLabels = { instance: "mirrorbuddy", env };

  // Collect business metrics (DAU, retention, maestri usage)
  const businessMetrics = await generateBusinessMetrics();
  for (const m of businessMetrics) {
    samples.push({
      name: m.name,
      labels: { ...m.labels, ...instanceLabels },
      value: m.value,
      timestamp: now,
    });
  }

  // Collect behavioral metrics (session health, safety, cost)
  const behavioralMetrics = await generateBehavioralMetrics();
  for (const m of behavioralMetrics) {
    samples.push({
      name: m.name,
      labels: { ...m.labels, ...instanceLabels },
      value: m.value,
      timestamp: now,
    });
  }

  return {
    samples,
    businessCount: businessMetrics.length,
    behavioralCount: behavioralMetrics.length,
  };
}

/**
 * POST: Main cron handler - collects and pushes daily metrics
 */
export const POST = pipe(
  withSentry("/api/cron/business-metrics-daily"),
  withCron,
)(async () => {
  const startTime = Date.now();
  const response: CronResponse = {
    status: "success",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
  };

  // Skip cron in non-production environments (staging/preview)
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    log.info(
      `[CRON] Skipping business-metrics-daily - not production (env: ${process.env.VERCEL_ENV})`,
    );
    return Response.json(
      {
        skipped: true,
        reason: "Not production environment",
        environment: process.env.VERCEL_ENV,
      },
      { status: 200 },
    );
  }

  // Check if Grafana Cloud is configured
  if (!process.env.GRAFANA_CLOUD_PROMETHEUS_URL) {
    response.status = "skipped";
    response.duration_ms = Date.now() - startTime;
    log.info("Daily metrics collection skipped (Grafana Cloud not configured)");
    return Response.json(response, { status: 200 });
  }

  // Collect daily metrics (business + behavioral)
  const { samples, businessCount, behavioralCount } =
    await collectDailyMetrics();

  if (samples.length === 0) {
    response.status = "skipped";
    response.duration_ms = Date.now() - startTime;
    log.info("No daily metrics to push");
    return Response.json(response, { status: 200 });
  }

  // Push to Grafana Cloud
  await pushToGrafana(samples);

  response.status = "success";
  response.business_metrics = businessCount;
  response.behavioral_metrics = behavioralCount;
  response.duration_ms = Date.now() - startTime;

  log.info("Daily metrics pushed to Grafana Cloud (F-05a)", {
    business_metrics: businessCount,
    behavioral_metrics: behavioralCount,
    total_samples: samples.length,
    duration_ms: response.duration_ms,
  });

  return Response.json(response, { status: 200 });
});

/**
 * GET: Manual testing endpoint (dev only)
 * Allows manual trigger of daily metrics collection during development
 */
// Vercel Cron uses GET by default
export const GET = POST;
