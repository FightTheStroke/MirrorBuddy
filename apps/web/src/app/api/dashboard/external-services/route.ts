// ============================================================================
// API ROUTE: External Services Metrics
// GET: API usage and quota metrics for Azure OpenAI, Google Drive, Brave Search
// SECURITY: Requires authentication
// PURPOSE: Monitor external service usage to prevent quota exceeded errors
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import {
  getAllExternalServiceUsage,
  getServiceAlerts,
  EXTERNAL_SERVICE_QUOTAS,
} from "@/lib/metrics/external-service-metrics";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/dashboard/external-services"),
  withAuth,
)(async (_ctx) => {
  const [allUsage, alerts] = await Promise.all([
    getAllExternalServiceUsage(),
    getServiceAlerts(),
  ]);

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
    });
  }

  // Check if any service needs attention
  const hasAlerts = alerts.length > 0;
  const criticalCount = alerts.filter(
    (a) => a.status === "critical" || a.status === "exceeded",
  ).length;
  const warningCount = alerts.filter((a) => a.status === "warning").length;

  return NextResponse.json({
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
