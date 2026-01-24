/**
 * Prometheus Push Service for Grafana Cloud
 *
 * Pushes metrics to Grafana Cloud using Influx Line Protocol.
 * Configure via environment variables:
 *   - GRAFANA_CLOUD_PROMETHEUS_URL (use /api/v1/push/influx/write endpoint)
 *   - GRAFANA_CLOUD_PROMETHEUS_USER
 *   - GRAFANA_CLOUD_API_KEY
 *   - GRAFANA_CLOUD_PUSH_INTERVAL (default: 60s)
 *
 * Tested: 18 Jan 2026 - metrics visible in Grafana Cloud
 */

import { logger } from "@/lib/logger";
import { collectServiceLimitsSamples } from "./service-limits-metrics";
import {
  collectHttpMetrics,
  type MetricSample,
} from "./http-metrics-collector";
import { collectTierMetrics } from "./tier-metrics-collector";
import {
  collectFunnelMetrics,
  collectBudgetMetrics,
  collectAbuseMetrics,
  collectConversionMetrics,
} from "./funnel-metrics-collectors";

interface PushConfig {
  url: string;
  user: string;
  apiKey: string;
  intervalSeconds: number;
}

/**
 * Escape a string for use as an Influx Line Protocol tag value.
 * Escapes backslash, comma, equals, and space characters.
 */
function escapeInfluxTagValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/=/g, "\\=")
    .replace(/ /g, "\\ ");
}

class PrometheusPushService {
  private config: PushConfig | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  /**
   * Initialize the push service with config from env vars
   */
  initialize(): boolean {
    const url = process.env.GRAFANA_CLOUD_PROMETHEUS_URL;
    const user = process.env.GRAFANA_CLOUD_PROMETHEUS_USER;
    const apiKey = process.env.GRAFANA_CLOUD_API_KEY;
    const interval = parseInt(
      process.env.GRAFANA_CLOUD_PUSH_INTERVAL || "60",
      10,
    );

    if (!url || !user || !apiKey) {
      logger.info("Grafana Cloud push disabled (missing config)");
      return false;
    }

    this.config = {
      url,
      user,
      apiKey,
      intervalSeconds: Math.max(15, interval), // Minimum 15s
    };

    logger.info("Grafana Cloud push initialized", {
      url: url.replace(/\/\/.*@/, "//***@"), // Redact credentials
      interval: this.config.intervalSeconds,
    });

    return true;
  }

  /**
   * Start the periodic push
   * NOTE: Disabled in development to avoid unnecessary Grafana Cloud costs
   */
  start(): void {
    // Skip in development - use local /api/metrics endpoint instead
    if (process.env.NODE_ENV !== "production") {
      logger.info("Grafana Cloud push disabled in development (cost savings)");
      return;
    }

    if (!this.config) {
      if (!this.initialize()) return;
    }

    if (this.isRunning) {
      logger.warn("Push service already running");
      return;
    }

    this.isRunning = true;
    const intervalMs = this.config!.intervalSeconds * 1000;

    // Push immediately on start
    this.pushMetrics().catch((err) =>
      logger.error("Initial metrics push failed", { error: String(err) }),
    );

    // Then push periodically
    this.intervalId = setInterval(() => {
      this.pushMetrics().catch((err) =>
        logger.error("Periodic metrics push failed", { error: String(err) }),
      );
    }, intervalMs);

    logger.info("Prometheus push service started", {
      intervalSeconds: this.config!.intervalSeconds,
    });
  }

  /**
   * Stop the periodic push
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info("Prometheus push service stopped");
  }

  /**
   * Push metrics to Grafana Cloud
   */
  async pushMetrics(): Promise<void> {
    if (!this.config) {
      throw new Error("Push service not initialized");
    }

    const samples = await this.collectSamples();
    if (samples.length === 0) {
      logger.debug("No metrics to push");
      return;
    }

    const body = this.formatInfluxLineProtocol(samples);

    const response = await fetch(this.config.url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: `Basic ${Buffer.from(`${this.config.user}:${this.config.apiKey}`).toString("base64")}`,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Push failed: ${response.status} ${text}`);
    }

    logger.debug("Metrics pushed successfully", { count: samples.length });
  }

  /**
   * Collect all metrics as samples
   */
  private async collectSamples(): Promise<MetricSample[]> {
    const samples: MetricSample[] = [];
    const now = Date.now();

    // Instance labels for all metrics
    const instanceLabels = {
      instance: "mirrorbuddy",
      env: process.env.NODE_ENV === "production" ? "production" : "development",
    };

    // Collect all metric types
    samples.push(
      ...collectHttpMetrics(instanceLabels, now),
      ...collectFunnelMetrics(instanceLabels, now),
      ...collectBudgetMetrics(instanceLabels, now),
      ...collectAbuseMetrics(instanceLabels, now),
      ...collectConversionMetrics(instanceLabels, now),
    );

    // Service limits metrics (F-21) - async collection
    const serviceLimitsSamples = await collectServiceLimitsSamples(
      instanceLabels,
      now,
    );
    samples.push(...serviceLimitsSamples);

    // Tier metrics (DAU/WAU/MAU per tier) - async collection
    const tierMetricsSamples = await collectTierMetrics(instanceLabels, now);
    samples.push(...tierMetricsSamples);

    return samples;
  }

  /**
   * Format samples as Influx Line Protocol (supported by Grafana Cloud)
   */
  private formatInfluxLineProtocol(samples: MetricSample[]): string {
    return samples
      .map((s) => {
        const tags = Object.entries(s.labels)
          .map(([k, v]) => `${k}=${escapeInfluxTagValue(v)}`)
          .join(",");
        return `${s.name},${tags} value=${s.value} ${s.timestamp * 1000000}`;
      })
      .join("\n");
  }

  /**
   * Check if service is configured and running
   */
  isConfigured(): boolean {
    return this.config !== null;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const prometheusPushService = new PrometheusPushService();
