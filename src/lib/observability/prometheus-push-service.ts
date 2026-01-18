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

import { metricsStore } from './metrics-store';
import { logger } from '@/lib/logger';

interface PushConfig {
  url: string;
  user: string;
  apiKey: string;
  intervalSeconds: number;
}

interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
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
    const interval = parseInt(process.env.GRAFANA_CLOUD_PUSH_INTERVAL || '60', 10);

    if (!url || !user || !apiKey) {
      logger.info('Grafana Cloud push disabled (missing config)');
      return false;
    }

    this.config = {
      url,
      user,
      apiKey,
      intervalSeconds: Math.max(15, interval), // Minimum 15s
    };

    logger.info('Grafana Cloud push initialized', {
      url: url.replace(/\/\/.*@/, '//***@'), // Redact credentials
      interval: this.config.intervalSeconds,
    });

    return true;
  }

  /**
   * Start the periodic push
   */
  start(): void {
    if (!this.config) {
      if (!this.initialize()) return;
    }

    if (this.isRunning) {
      logger.warn('Push service already running');
      return;
    }

    this.isRunning = true;
    const intervalMs = this.config!.intervalSeconds * 1000;

    // Push immediately on start
    this.pushMetrics().catch((err) =>
      logger.error('Initial metrics push failed', { error: String(err) })
    );

    // Then push periodically
    this.intervalId = setInterval(() => {
      this.pushMetrics().catch((err) =>
        logger.error('Periodic metrics push failed', { error: String(err) })
      );
    }, intervalMs);

    logger.info('Prometheus push service started', {
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
    logger.info('Prometheus push service stopped');
  }

  /**
   * Push metrics to Grafana Cloud
   */
  async pushMetrics(): Promise<void> {
    if (!this.config) {
      throw new Error('Push service not initialized');
    }

    const samples = this.collectSamples();
    if (samples.length === 0) {
      logger.debug('No metrics to push');
      return;
    }

    const body = this.formatInfluxLineProtocol(samples);

    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Authorization: `Basic ${Buffer.from(`${this.config.user}:${this.config.apiKey}`).toString('base64')}`,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Push failed: ${response.status} ${text}`);
    }

    logger.debug('Metrics pushed successfully', { count: samples.length });
  }

  /**
   * Collect all metrics as samples
   */
  private collectSamples(): MetricSample[] {
    const samples: MetricSample[] = [];
    const now = Date.now();
    const summary = metricsStore.getMetricsSummary();

    // Add instance label to all metrics
    // env=production for real data, env=test for test script
    const instanceLabels = {
      instance: 'mirrorbuddy',
      env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    };

    // Route-level metrics
    for (const [route, metrics] of Object.entries(summary.routes)) {
      const routeLabels = { ...instanceLabels, route };

      samples.push(
        { name: 'http_requests_total', labels: routeLabels, value: metrics.count, timestamp: now },
        { name: 'http_request_duration_seconds_p50', labels: routeLabels, value: metrics.p50LatencyMs / 1000, timestamp: now },
        { name: 'http_request_duration_seconds_p95', labels: routeLabels, value: metrics.p95LatencyMs / 1000, timestamp: now },
        { name: 'http_request_duration_seconds_p99', labels: routeLabels, value: metrics.p99LatencyMs / 1000, timestamp: now },
        { name: 'http_request_errors_total', labels: routeLabels, value: metrics.errorCount, timestamp: now },
        { name: 'http_request_error_rate', labels: routeLabels, value: metrics.errorRate, timestamp: now }
      );

      // Error breakdown by status
      for (const [status, count] of Object.entries(metrics.errors)) {
        samples.push({
          name: 'http_request_errors_by_status',
          labels: { ...routeLabels, status_code: status },
          value: count,
          timestamp: now,
        });
      }
    }

    // Overall metrics
    samples.push(
      { name: 'http_requests_total_all', labels: instanceLabels, value: summary.totalRequests, timestamp: now },
      { name: 'http_errors_total_all', labels: instanceLabels, value: summary.totalErrors, timestamp: now },
      { name: 'http_error_rate_all', labels: instanceLabels, value: summary.overallErrorRate, timestamp: now }
    );

    return samples;
  }

  /**
   * Format samples as Influx Line Protocol (supported by Grafana Cloud)
   */
  private formatInfluxLineProtocol(samples: MetricSample[]): string {
    return samples
      .map((s) => {
        const tags = Object.entries(s.labels)
          .map(([k, v]) => `${k}=${v.replace(/[, ]/g, '\\ ')}`)
          .join(',');
        return `${s.name},${tags} value=${s.value} ${s.timestamp * 1000000}`;
      })
      .join('\n');
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
