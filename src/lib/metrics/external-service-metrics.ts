/**
 * External Service Metrics
 *
 * Tracks API usage and quota limits for external services:
 * - Azure OpenAI (Chat, Embeddings, TTS, Realtime)
 * - Google Drive API
 * - Brave Search API
 *
 * QUOTA LIMITS (sources documented per service):
 * - Azure OpenAI: TPM (tokens/min), RPM (requests/min) per deployment
 * - Google Drive: 12,000 queries/min (default), 1B/day aggregate
 * - Brave Search: 2,000 queries/month (free tier)
 *
 * @see https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits
 * @see https://developers.google.com/drive/api/guides/limits
 * @see https://brave.com/search/api/
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Quota limits configuration */
export const EXTERNAL_SERVICE_QUOTAS = {
  // Azure OpenAI quotas (typical S0 tier, adjust per actual subscription)
  AZURE_OPENAI: {
    CHAT_TPM: 120000, // 120K tokens/minute for gpt-4o
    CHAT_RPM: 720, // 720 requests/minute
    EMBEDDING_TPM: 350000, // 350K tokens/minute
    REALTIME_SESSIONS_CONCURRENT: 100, // concurrent sessions
    TTS_RPM: 150, // 150 requests/minute
    WARN_THRESHOLD: 0.8, // 80% usage triggers warning
    CRITICAL_THRESHOLD: 0.95, // 95% usage triggers critical alert
  },
  // Google Drive quotas (default cloud project)
  GOOGLE_DRIVE: {
    QUERIES_PER_MINUTE: 12000, // per project
    QUERIES_PER_USER_SECOND: 10, // per user
    DAILY_QUERIES: 1000000000, // 1B aggregate
    WARN_THRESHOLD: 0.7, // Drive API failures are disruptive
    CRITICAL_THRESHOLD: 0.9,
  },
  // Brave Search quotas (free tier)
  BRAVE_SEARCH: {
    MONTHLY_QUERIES: 2000, // free tier limit
    WARN_THRESHOLD: 0.5, // Warn at 50% to plan upgrade
    CRITICAL_THRESHOLD: 0.9,
  },
} as const;

/** External service usage snapshot */
export interface ExternalServiceUsage {
  service: string;
  metric: string;
  currentValue: number;
  limit: number;
  usagePercent: number;
  status: "ok" | "warning" | "critical" | "exceeded";
  period: string;
}

/** Track API call to external service */
interface ApiCallRecord {
  service: string;
  action: string;
  tokens?: number;
  success: boolean;
  latencyMs: number;
  errorCode?: string;
}

/**
 * Record an external API call for metrics tracking.
 * Call this from API routes after each external service call.
 */
export async function recordExternalApiCall(
  record: ApiCallRecord,
): Promise<void> {
  try {
    const eventId = `ext_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await prisma.telemetryEvent.create({
      data: {
        eventId,
        timestamp: new Date(),
        sessionId: "system", // External API calls are system-level, not user-session bound
        category: "external_api",
        action: record.action,
        label: record.service,
        value: record.tokens || 1,
        metadata: JSON.stringify({
          success: record.success,
          latencyMs: record.latencyMs,
          errorCode: record.errorCode,
        }),
      },
    });
  } catch (error) {
    // Non-critical, log and continue
    logger.warn("Failed to record external API call", {
      error: String(error),
      service: record.service,
    });
  }
}

/**
 * Get Azure OpenAI usage metrics for the current minute window.
 */
export async function getAzureOpenAIUsage(): Promise<ExternalServiceUsage[]> {
  const metrics: ExternalServiceUsage[] = [];
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60000);

  // Query telemetry for Azure OpenAI calls
  const azureEvents = await prisma.telemetryEvent.findMany({
    where: {
      category: "external_api",
      label: "azure_openai",
      timestamp: { gte: minuteAgo },
    },
    select: { action: true, value: true },
  });

  // Aggregate by action
  type AzureEvent = { action: string; value: number | null };
  const chatTokens = azureEvents
    .filter((e: AzureEvent) => e.action === "chat_completion")
    .reduce((sum: number, e: AzureEvent) => sum + (e.value || 0), 0);
  const chatRequests = azureEvents.filter(
    (e: AzureEvent) => e.action === "chat_completion",
  ).length;
  const embeddingTokens = azureEvents
    .filter((e: AzureEvent) => e.action === "embedding")
    .reduce((sum: number, e: AzureEvent) => sum + (e.value || 0), 0);
  const ttsRequests = azureEvents.filter(
    (e: AzureEvent) => e.action === "tts",
  ).length;

  const quotas = EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI;

  metrics.push(
    createUsageMetric(
      "Azure OpenAI",
      "Chat Tokens/min",
      chatTokens,
      quotas.CHAT_TPM,
      "1m",
      quotas.WARN_THRESHOLD,
      quotas.CRITICAL_THRESHOLD,
    ),
    createUsageMetric(
      "Azure OpenAI",
      "Chat Requests/min",
      chatRequests,
      quotas.CHAT_RPM,
      "1m",
      quotas.WARN_THRESHOLD,
      quotas.CRITICAL_THRESHOLD,
    ),
    createUsageMetric(
      "Azure OpenAI",
      "Embedding Tokens/min",
      embeddingTokens,
      quotas.EMBEDDING_TPM,
      "1m",
      quotas.WARN_THRESHOLD,
      quotas.CRITICAL_THRESHOLD,
    ),
    createUsageMetric(
      "Azure OpenAI",
      "TTS Requests/min",
      ttsRequests,
      quotas.TTS_RPM,
      "1m",
      quotas.WARN_THRESHOLD,
      quotas.CRITICAL_THRESHOLD,
    ),
  );

  return metrics;
}

/**
 * Get Google Drive API usage metrics.
 */
export async function getGoogleDriveUsage(): Promise<ExternalServiceUsage[]> {
  const metrics: ExternalServiceUsage[] = [];
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Minute-level metrics
  const driveMinuteEvents = await prisma.telemetryEvent.count({
    where: {
      category: "external_api",
      label: "google_drive",
      timestamp: { gte: minuteAgo },
    },
  });

  // Daily aggregate
  const driveDayEvents = await prisma.telemetryEvent.count({
    where: {
      category: "external_api",
      label: "google_drive",
      timestamp: { gte: dayAgo },
    },
  });

  const quotas = EXTERNAL_SERVICE_QUOTAS.GOOGLE_DRIVE;

  metrics.push(
    createUsageMetric(
      "Google Drive",
      "Queries/min",
      driveMinuteEvents,
      quotas.QUERIES_PER_MINUTE,
      "1m",
      quotas.WARN_THRESHOLD,
      quotas.CRITICAL_THRESHOLD,
    ),
    createUsageMetric(
      "Google Drive",
      "Queries/day",
      driveDayEvents,
      quotas.DAILY_QUERIES,
      "24h",
      quotas.WARN_THRESHOLD,
      quotas.CRITICAL_THRESHOLD,
    ),
  );

  return metrics;
}

/**
 * Get Brave Search API usage metrics.
 */
export async function getBraveSearchUsage(): Promise<ExternalServiceUsage[]> {
  const now = new Date();
  // Get first day of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const searchEvents = await prisma.telemetryEvent.count({
    where: {
      category: "external_api",
      label: "brave_search",
      timestamp: { gte: monthStart },
    },
  });

  const quotas = EXTERNAL_SERVICE_QUOTAS.BRAVE_SEARCH;

  return [
    createUsageMetric(
      "Brave Search",
      "Queries/month",
      searchEvents,
      quotas.MONTHLY_QUERIES,
      "month",
      quotas.WARN_THRESHOLD,
      quotas.CRITICAL_THRESHOLD,
    ),
  ];
}

/**
 * Get all external service usage metrics.
 */
export async function getAllExternalServiceUsage(): Promise<
  ExternalServiceUsage[]
> {
  const [azure, drive, brave] = await Promise.all([
    getAzureOpenAIUsage(),
    getGoogleDriveUsage(),
    getBraveSearchUsage(),
  ]);

  return [...azure, ...drive, ...brave];
}

/**
 * Get services that are approaching or exceeding limits.
 */
export async function getServiceAlerts(): Promise<ExternalServiceUsage[]> {
  const all = await getAllExternalServiceUsage();
  return all.filter((m) => m.status !== "ok");
}

/**
 * Generate Prometheus-format metrics for external services.
 */
export async function generateExternalServiceMetrics(): Promise<string> {
  const usage = await getAllExternalServiceUsage();
  const lines: string[] = [];

  lines.push(
    "# HELP mirrorbuddy_external_service_usage External service API usage",
  );
  lines.push("# TYPE mirrorbuddy_external_service_usage gauge");

  for (const metric of usage) {
    const labels = `service="${metric.service}",metric="${metric.metric}",period="${metric.period}"`;
    lines.push(
      `mirrorbuddy_external_service_usage{${labels}} ${metric.usagePercent}`,
    );
  }

  lines.push(
    "# HELP mirrorbuddy_external_service_status External service status (0=ok,1=warning,2=critical,3=exceeded)",
  );
  lines.push("# TYPE mirrorbuddy_external_service_status gauge");

  for (const metric of usage) {
    const statusValue =
      metric.status === "ok"
        ? 0
        : metric.status === "warning"
          ? 1
          : metric.status === "critical"
            ? 2
            : 3;
    const labels = `service="${metric.service}",metric="${metric.metric}"`;
    lines.push(`mirrorbuddy_external_service_status{${labels}} ${statusValue}`);
  }

  return lines.join("\n");
}

/** Helper to create usage metric with status */
function createUsageMetric(
  service: string,
  metric: string,
  current: number,
  limit: number,
  period: string,
  warnThreshold: number,
  criticalThreshold: number,
): ExternalServiceUsage {
  const usagePercent = limit > 0 ? current / limit : 0;

  let status: ExternalServiceUsage["status"] = "ok";
  if (usagePercent >= 1) {
    status = "exceeded";
  } else if (usagePercent >= criticalThreshold) {
    status = "critical";
  } else if (usagePercent >= warnThreshold) {
    status = "warning";
  }

  // Log warnings/criticals
  if (status === "critical" || status === "exceeded") {
    logger.error("External service quota alert", {
      service,
      metric,
      current,
      limit,
      usagePercent: Math.round(usagePercent * 100),
      status,
    });
  } else if (status === "warning") {
    logger.warn("External service quota warning", {
      service,
      metric,
      current,
      limit,
      usagePercent: Math.round(usagePercent * 100),
    });
  }

  return {
    service,
    metric,
    currentValue: current,
    limit,
    usagePercent: Math.round(usagePercent * 10000) / 100, // 2 decimal places
    status,
    period,
  };
}
