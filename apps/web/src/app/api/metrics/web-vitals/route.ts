// ============================================================================
// API ROUTE: Web Vitals Metrics
// POST: Accept Web Vitals data and push immediately to Grafana Cloud
// F-05: Real-time client-side performance monitoring
// ============================================================================

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { safeReadJson } from '@/lib/api/safe-json';
import {
  canCollectOptionalAnalytics,
  optionalAnalyticsDenied,
} from '@/lib/telemetry/optional-analytics-server';
import {
  checkRateLimitAsync,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';

export const revalidate = 0;
const metricSchema = z.object({
  name: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
  value: z.number().finite().nonnegative(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  route: z.string().max(2048),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']),
  connectionType: z.string().max(128).optional(),
});
const payloadSchema = z.object({ metrics: z.array(metricSchema).max(100) });
type WebVitalMetric = z.infer<typeof metricSchema>;
type WebVitalsPayload = z.infer<typeof payloadSchema>;

/**
 * Convert metric to Grafana format
 */
function formatMetricForGrafana(metric: WebVitalMetric): {
  name: string;
  value: number;
  labels: Record<string, string>;
} {
  // Convert metric name to Grafana metric name
  const nameMap: Record<string, string> = {
    LCP: 'web_vitals_lcp_seconds',
    CLS: 'web_vitals_cls_score',
    INP: 'web_vitals_inp_seconds',
    TTFB: 'web_vitals_ttfb_seconds',
    FCP: 'web_vitals_fcp_seconds',
  };

  // Convert milliseconds to seconds for time-based metrics
  const needsConversion = ['LCP', 'INP', 'TTFB', 'FCP'].includes(metric.name);
  const value = needsConversion ? metric.value / 1000 : metric.value;

  // Build labels
  const labels: Record<string, string> = {
    route: metric.route,
    device_type: metric.deviceType,
    connection_type: metric.connectionType || 'unknown',
    rating: metric.rating,
  };

  return {
    name: nameMap[metric.name],
    value,
    labels,
  };
}

/**
 * Format metrics as Influx Line Protocol
 */
function formatInfluxLineProtocol(
  metrics: Array<{
    name: string;
    value: number;
    labels: Record<string, string>;
  }>,
  timestamp: number,
): string {
  return metrics
    .map((m) => {
      const tags = Object.entries(m.labels)
        .map(([k, v]) => {
          // Influx Line Protocol requires escaping: backslash first, then comma/space/equals
          const escaped = v
            .replace(/\\/g, '\\\\') // Escape backslashes first
            .replace(/,/g, '\\,') // Escape commas
            .replace(/ /g, '\\ ') // Escape spaces
            .replace(/=/g, '\\='); // Escape equals
          return `${k}=${escaped}`;
        })
        .join(',');
      return `${m.name},${tags} value=${m.value} ${timestamp * 1000000}`;
    })
    .join('\n');
}

/**
 * Push metrics to Grafana Cloud
 */
async function pushToGrafana(payload: WebVitalsPayload): Promise<void> {
  const url = process.env.GRAFANA_CLOUD_PROMETHEUS_URL;
  const user = process.env.GRAFANA_CLOUD_PROMETHEUS_USER;
  const apiKey = process.env.GRAFANA_CLOUD_API_KEY;

  if (!url || !user || !apiKey) {
    throw new Error('Grafana Cloud not configured');
  }

  // Convert all metrics to Grafana format
  const grafanaMetrics = payload.metrics.map(formatMetricForGrafana);

  // Format as Influx Line Protocol
  const timestamp = Date.now();
  const body = formatInfluxLineProtocol(grafanaMetrics, timestamp);

  // Push to Grafana Cloud
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      Authorization: `Basic ${Buffer.from(`${user}:${apiKey}`).toString('base64')}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Grafana push failed: ${response.status} ${text}`);
  }

  logger.debug('Web Vitals pushed to Grafana', {
    count: grafanaMetrics.length,
    metrics: grafanaMetrics.map((m) => m.name),
  });
}

/**
 * POST /api/metrics/web-vitals
 * Accept Web Vitals data and push to Grafana Cloud
 */

export const POST = pipe(
  withSentry('/api/metrics/web-vitals'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  // Rate limiting: 60 req/min per IP (F-05 protection)
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = await checkRateLimitAsync(`web-vitals:${clientId}`, RATE_LIMITS.WEB_VITALS);

  if (!rateLimit.success) {
    logger.warn('Web Vitals rate limit exceeded', {
      clientId,
      endpoint: '/api/metrics/web-vitals',
    });
    return rateLimitResponse(rateLimit);
  }

  if (!(await canCollectOptionalAnalytics(ctx.userId))) return optionalAnalyticsDenied();
  const parsed = payloadSchema.safeParse(await safeReadJson(ctx.req));

  // Validate payload
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
  }

  // Push to Grafana immediately (no batching)
  try {
    await pushToGrafana(parsed.data);
  } catch (error) {
    logger.error('Failed to push Web Vitals to Grafana', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to process metrics' }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: parsed.data.metrics.length }, { status: 201 });
});
