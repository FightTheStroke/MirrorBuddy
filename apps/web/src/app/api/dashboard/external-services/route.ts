// ============================================================================
// API ROUTE: External Services Metrics
// GET: API usage and quota metrics for Azure OpenAI, Google Drive, Brave Search
// SECURITY: Requires admin read access (ADMIN or ADMIN_READONLY)
// PURPOSE: Monitor external service usage to prevent quota exceeded errors
// ============================================================================

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { metricTruth, snapshotContext, type MetricTruth } from '@/lib/admin/metric-truth';
import {
  getAllExternalServiceUsage,
  EXTERNAL_SERVICE_QUOTAS,
} from '@/lib/metrics/external-service-metrics';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/dashboard/external-services'),
  withAdminReadOnly,
)(async (_ctx) => {
  // One read: alerts are the same usage rows, filtered. Reading them again ran
  // every usage query twice per request (Sentry MIRRORBUDDY-3J, N+1).
  const allUsage = await getAllExternalServiceUsage();
  const alerts = allUsage.filter((usage) => usage.status !== 'ok');

  // Group by service
  const byService: Record<
    string,
    Array<{
      metric: string;
      current: number;
      limit: number;
      usagePercent: number;
      status: string;
      period: string;
      truth: MetricTruth;
    }>
  > = {};

  for (const usage of allUsage) {
    if (!byService[usage.service]) {
      byService[usage.service] = [];
    }
    byService[usage.service].push({
      metric: usage.metric,
      current: usage.currentValue,
      limit: usage.limit,
      usagePercent: usage.usagePercent,
      status: usage.status,
      period: usage.period,
      truth: metricTruth(usage.usagePercent, {
        source: 'TelemetryEvent (external_api) / configured quota',
        computedAt: usage.computedAt ?? null,
        window: usage.window ?? { start: null, end: null },
        population: 'recordedTelemetry',
        estimate: 'quotaAssumption',
      }),
    });
  }

  // Check if any service needs attention
  const hasAlerts = alerts.length > 0;
  const criticalCount = alerts.filter(
    (a) => a.status === 'critical' || a.status === 'exceeded',
  ).length;
  const warningCount = alerts.filter((a) => a.status === 'warning').length;

  return NextResponse.json({
    provenance: metricTruth(Object.keys(byService).length, {
      ...snapshotContext('TelemetryEvent (external_api)', new Date().toISOString()),
      population: 'recordedTelemetry',
    }),
    summary: {
      totalServices: Object.keys(byService).length,
      hasAlerts,
      criticalCount,
      warningCount,
      alertDetails: alerts.map((a) => ({
        service: a.service,
        metric: a.metric,
        usagePercent: a.usagePercent,
        status: a.status,
      })),
    },
    byService,
    quotas: {
      azureOpenAI: {
        chatTpm: EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.CHAT_TPM,
        chatRpm: EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.CHAT_RPM,
        embeddingTpm: EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.EMBEDDING_TPM,
        ttsRpm: EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.TTS_RPM,
        warnThreshold: EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.WARN_THRESHOLD,
      },
      googleDrive: {
        queriesPerMin: EXTERNAL_SERVICE_QUOTAS.GOOGLE_DRIVE.QUERIES_PER_MINUTE,
        dailyQueries: EXTERNAL_SERVICE_QUOTAS.GOOGLE_DRIVE.DAILY_QUERIES,
        warnThreshold: EXTERNAL_SERVICE_QUOTAS.GOOGLE_DRIVE.WARN_THRESHOLD,
      },
      braveSearch: {
        monthlyQueries: EXTERNAL_SERVICE_QUOTAS.BRAVE_SEARCH.MONTHLY_QUERIES,
        warnThreshold: EXTERNAL_SERVICE_QUOTAS.BRAVE_SEARCH.WARN_THRESHOLD,
      },
    },
  });
});
