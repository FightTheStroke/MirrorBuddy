// ============================================================================
// API ROUTE: Prometheus Metrics
// GET: Export metrics in Prometheus format for Grafana integration
// https://prometheus.io/docs/instrumenting/exposition_formats/
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface MetricLine {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  labels: Record<string, string>;
  value: number;
}

export async function GET() {
  try {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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
      // Total users
      prisma.user.count(),

      // Active users in last hour (unique userIds in events)
      prisma.telemetryEvent.findMany({
        where: { timestamp: { gte: hourAgo }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }).then((r) => r.length),

      // Active users in last 24 hours
      prisma.telemetryEvent.findMany({
        where: { timestamp: { gte: dayAgo }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }).then((r) => r.length),

      // Sessions in last hour
      prisma.telemetryEvent.count({
        where: {
          category: 'navigation',
          action: 'session_started',
          timestamp: { gte: hourAgo },
        },
      }),

      // Sessions in last 24 hours
      prisma.telemetryEvent.count({
        where: {
          category: 'navigation',
          action: 'session_started',
          timestamp: { gte: dayAgo },
        },
      }),

      // Event counts by category (last hour)
      prisma.telemetryEvent.groupBy({
        by: ['category'],
        where: { timestamp: { gte: hourAgo } },
        _count: true,
      }),

      // Error count (last hour)
      prisma.telemetryEvent.count({
        where: {
          category: 'error',
          timestamp: { gte: hourAgo },
        },
      }),

      // Average API response time (last hour)
      prisma.telemetryEvent.aggregate({
        where: {
          category: 'performance',
          action: 'api_response',
          timestamp: { gte: hourAgo },
        },
        _avg: { value: true },
      }),
    ]);

    // Fetch maestro usage metrics
    const maestroUsage = await prisma.studySession.groupBy({
      by: ['maestroId'],
      where: { startedAt: { gte: dayAgo } },
      _count: true,
    });

    // Build Prometheus metrics
    const metrics: MetricLine[] = [];

    // User metrics
    metrics.push({
      name: 'convergio_users_total',
      type: 'gauge',
      help: 'Total number of registered users',
      labels: {},
      value: totalUsers,
    });

    metrics.push({
      name: 'convergio_users_active',
      type: 'gauge',
      help: 'Number of active users',
      labels: { period: '1h' },
      value: activeUsersHour,
    });

    metrics.push({
      name: 'convergio_users_active',
      type: 'gauge',
      help: 'Number of active users',
      labels: { period: '24h' },
      value: activeUsersDay,
    });

    // Session metrics
    metrics.push({
      name: 'convergio_sessions_total',
      type: 'counter',
      help: 'Total number of sessions',
      labels: { period: '1h' },
      value: sessionsHour,
    });

    metrics.push({
      name: 'convergio_sessions_total',
      type: 'counter',
      help: 'Total number of sessions',
      labels: { period: '24h' },
      value: sessionsDay,
    });

    // Event metrics by category
    for (const cat of eventCounts) {
      metrics.push({
        name: 'convergio_events_total',
        type: 'counter',
        help: 'Total events by category',
        labels: { category: cat.category, period: '1h' },
        value: cat._count,
      });
    }

    // Error metrics
    metrics.push({
      name: 'convergio_errors_total',
      type: 'counter',
      help: 'Total number of errors',
      labels: { period: '1h' },
      value: errorCount,
    });

    // Performance metrics
    metrics.push({
      name: 'convergio_api_response_ms',
      type: 'gauge',
      help: 'Average API response time in milliseconds',
      labels: { period: '1h' },
      value: avgResponseTime._avg.value || 0,
    });

    // Maestro usage metrics
    for (const m of maestroUsage) {
      metrics.push({
        name: 'convergio_maestro_sessions',
        type: 'counter',
        help: 'Sessions by maestro',
        labels: { maestro_id: m.maestroId, period: '24h' },
        value: m._count,
      });
    }

    // Format as Prometheus exposition format
    const output = formatPrometheusOutput(metrics);

    return new NextResponse(output, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Metrics GET error', { error: String(error) });
    return new NextResponse('# Error fetching metrics\n', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

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
            .join(',')}}`
        : '';

    lines.push(`${metric.name}${labelStr} ${metric.value}`);
  }

  // Add timestamp comment
  lines.push('');
  lines.push(`# Generated at ${new Date().toISOString()}`);

  return lines.join('\n');
}
