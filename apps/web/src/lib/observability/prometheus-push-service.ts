import { logger } from '@/lib/logger';
import {
  isGrafanaConfigured,
  logCollectorSkippedOnce,
  reportCollectorFailure,
} from './collector-diagnostics';
import { collectServiceLimitsSamples } from './service-limits-metrics';
import { collectHttpMetrics, type MetricSample } from './http-metrics-collector';
import { collectTierMetrics } from './tier-metrics-collector';
import { collectMetricSource } from './collect-metric-source';
import {
  collectFunnelMetrics,
  collectBudgetMetrics,
  collectAbuseMetrics,
  collectConversionMetrics,
} from './funnel-metrics-collectors';

interface PushConfig {
  url: string;
  user: string;
  apiKey: string;
  intervalSeconds: number;
}

/** Group transport rejections by status, not potentially sensitive response bodies. */
export class MetricsPushError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`Metrics push rejected: HTTP ${status}`);
    this.name = 'MetricsPushError';
    this.status = status;
    this.responseBody = (responseBody ?? '').slice(0, 500);
  }
}

/**
 * Collectors that query the database. They belong to a single scheduled caller:
 * running them from a per-instance timer multiplies database connections by the
 * number of live serverless instances, which is not bounded by the pool.
 */
const databaseBackedCollectors = {
  service_limits: collectServiceLimitsSamples,
  tier: collectTierMetrics,
};

/** Collect the database-backed families once, for the authenticated cron route. */
export async function collectDatabaseBackedSamples(
  instanceLabels: Record<string, string>,
  now: number,
): Promise<MetricSample[]> {
  const samples: MetricSample[] = [];
  for (const [name, collect] of Object.entries(databaseBackedCollectors)) {
    samples.push(
      ...(await collectMetricSource(name, () => collect(instanceLabels, now), instanceLabels, now)),
    );
  }
  return samples;
}

/**
 * Escape a string for use as an Influx Line Protocol tag value.
 * Escapes backslash, comma, equals, and space characters.
 */
function escapeInfluxTagValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/=/g, '\\=')
    .replace(/ /g, '\\ ');
}

class PrometheusPushService {
  private config: PushConfig | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  initialize(): boolean {
    const url = process.env.GRAFANA_CLOUD_PROMETHEUS_URL;
    const user = process.env.GRAFANA_CLOUD_PROMETHEUS_USER;
    const apiKey = process.env.GRAFANA_CLOUD_API_KEY;
    const interval = parseInt(process.env.GRAFANA_CLOUD_PUSH_INTERVAL || '60', 10);

    if (!isGrafanaConfigured() || !url || !user || !apiKey) {
      this.config = null;
      logCollectorSkippedOnce('grafana');
      return false;
    }

    this.config = {
      url,
      user,
      apiKey,
      intervalSeconds: Number.isFinite(interval) ? Math.max(15, interval) : 60,
    };

    logger.info('Grafana Cloud push initialized', {
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
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Grafana Cloud push disabled in development (cost savings)');
      return;
    }

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
    this.pushMetrics().catch((error: unknown) =>
      reportCollectorFailure('grafana_transport', error),
    );

    // Then push periodically
    this.intervalId = setInterval(() => {
      this.pushMetrics().catch((error: unknown) =>
        reportCollectorFailure('grafana_transport', error),
      );
    }, intervalMs);

    logger.info('Prometheus push service started', {
      intervalSeconds: this.config!.intervalSeconds,
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Prometheus push service stopped');
  }

  async pushMetrics(): Promise<void> {
    if (!isGrafanaConfigured()) {
      this.config = null;
      logCollectorSkippedOnce('grafana');
      return;
    }
    if (!this.config) this.initialize();
    if (!this.config) {
      return;
    }

    const samples = await this.collectSamples();
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
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new MetricsPushError(response.status, text);
    }

    logger.debug('Metrics pushed successfully', { count: samples.length });
  }

  private async collectSamples(): Promise<MetricSample[]> {
    const samples: MetricSample[] = [];
    const now = Date.now();

    // Instance labels for all metrics
    const instanceLabels = {
      instance: 'mirrorbuddy',
      env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    };

    const collectors = {
      http: collectHttpMetrics,
      funnel: collectFunnelMetrics,
      budget: collectBudgetMetrics,
      abuse: collectAbuseMetrics,
      conversion: collectConversionMetrics,
      // On Vercel every function instance owns this timer, so a database-backed
      // collector here opens connections once per instance per interval. The
      // authenticated cron route collects those once per schedule instead.
      ...(process.env.VERCEL === '1' ? {} : databaseBackedCollectors),
    };
    for (const [name, collect] of Object.entries(collectors)) {
      samples.push(
        ...(await collectMetricSource(
          name,
          () => collect(instanceLabels, now),
          instanceLabels,
          now,
        )),
      );
    }

    return samples;
  }

  private formatInfluxLineProtocol(samples: MetricSample[]): string {
    return samples
      .map((s) => {
        const tags = Object.entries(s.labels)
          .map(([k, v]) => `${k}=${escapeInfluxTagValue(v)}`)
          .join(',');
        return `${s.name},${tags} value=${s.value} ${s.timestamp * 1000000}`;
      })
      .join('\n');
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const prometheusPushService = new PrometheusPushService();
