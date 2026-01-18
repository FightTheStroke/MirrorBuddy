// ============================================================================
// API ROUTE: Web Vitals Metrics
// POST: Accept Web Vitals data and push immediately to Grafana Cloud
// F-05: Real-time client-side performance monitoring
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  checkRateLimitAsync,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';

interface WebVitalMetric {
  name: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  route: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType?: '4g' | 'wifi' | 'unknown';
  userId?: string;
}

interface WebVitalsPayload {
  metrics: WebVitalMetric[];
}

/**
 * Validate Web Vitals payload
 */
function validatePayload(data: unknown): data is WebVitalsPayload {
  if (!data || typeof data !== 'object') return false;

  const payload = data as Partial<WebVitalsPayload>;
  if (!Array.isArray(payload.metrics)) return false;

  return payload.metrics.every((m) => {
    return (
      typeof m === 'object' &&
      typeof m.name === 'string' &&
      ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'].includes(m.name) &&
      typeof m.value === 'number' &&
      typeof m.rating === 'string' &&
      ['good', 'needs-improvement', 'poor'].includes(m.rating) &&
      typeof m.route === 'string' &&
      typeof m.deviceType === 'string' &&
      ['mobile', 'tablet', 'desktop'].includes(m.deviceType)
    );
  });
}

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

  // Add user_id if provided (for debugging)
  if (metric.userId) {
    labels.user_id = metric.userId;
  }

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
  metrics: Array<{ name: string; value: number; labels: Record<string, string> }>,
  timestamp: number,
): string {
  return metrics
    .map((m) => {
      const tags = Object.entries(m.labels)
        .map(([k, v]) => `${k}=${v.replace(/[, ]/g, '\\ ')}`)
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
export async function POST(request: NextRequest) {
  // Rate limiting: 60 req/min per IP (F-05 protection)
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimitAsync(
    `web-vitals:${clientId}`,
    RATE_LIMITS.WEB_VITALS,
  );

  if (!rateLimit.success) {
    logger.warn('Web Vitals rate limit exceeded', {
      clientId,
      endpoint: '/api/metrics/web-vitals',
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();

    // Validate payload
    if (!validatePayload(body)) {
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 },
      );
    }

    // Push to Grafana immediately (no batching)
    await pushToGrafana(body);

    return NextResponse.json(
      { success: true, count: body.metrics.length },
      { status: 201 },
    );
  } catch (error) {
    logger.error('Web Vitals POST error', { error: String(error) });

    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 },
    );
  }
}
