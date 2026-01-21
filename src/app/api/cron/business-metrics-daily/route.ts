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

import { NextRequest, NextResponse } from "next/server";
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
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const response: CronResponse = {
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
      log.info(
        "Daily metrics collection skipped (Grafana Cloud not configured)",
      );
      return NextResponse.json(response, { status: 200 });
    }

    // Collect daily metrics (business + behavioral)
    const { samples, businessCount, behavioralCount } =
      await collectDailyMetrics();

    if (samples.length === 0) {
      response.status = "skipped";
      response.duration_ms = Date.now() - startTime;
      log.info("No daily metrics to push");
      return NextResponse.json(response, { status: 200 });
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

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    response.status = "error";
    response.duration_ms = Date.now() - startTime;
    response.error = error instanceof Error ? error.message : String(error);

    log.error("Daily metrics collection failed", {
      error: response.error,
      duration_ms: response.duration_ms,
    });

    // Log errors but allow graceful degradation - don't break the cron schedule
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET: Manual testing endpoint (dev only)
 * Allows manual trigger of daily metrics collection during development
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Manual testing not allowed in production" },
      { status: 405 },
    );
  }

  log.info("Manual GET request to daily metrics endpoint in development mode");
  return POST(request);
}
