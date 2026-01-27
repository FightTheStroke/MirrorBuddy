/**
 * Telemetry Metrics Collector
 * Aggregates telemetry events by locale for Prometheus metrics
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { MetricSample } from "./http-metrics-collector";

/**
 * Time window for aggregating telemetry events (last 5 minutes)
 */
const WINDOW_MINUTES = 5;

interface LocaleMetrics {
  pageViews: number;
  sessions: number;
  chatMessages: number;
  featureUsage: Record<string, number>;
}

/**
 * Extract locale from event metadata
 */
function extractLocale(metadata: string | null): string {
  if (!metadata) return "unknown";

  try {
    const parsed = JSON.parse(metadata);
    return parsed.locale || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Collect telemetry metrics aggregated by locale
 */
export async function collectTelemetryMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
): Promise<MetricSample[]> {
  try {
    const samples: MetricSample[] = [];
    const cutoffTime = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

    // Fetch recent telemetry events
    const events = await prisma.telemetryEvent.findMany({
      where: {
        timestamp: {
          gte: cutoffTime,
        },
      },
      select: {
        category: true,
        action: true,
        label: true,
        metadata: true,
        sessionId: true,
      },
    });

    // Aggregate metrics by locale
    const metricsByLocale: Record<string, LocaleMetrics> = {};

    const uniqueSessions = new Set<string>();

    for (const event of events) {
      const locale = extractLocale(event.metadata);

      if (!metricsByLocale[locale]) {
        metricsByLocale[locale] = {
          pageViews: 0,
          sessions: 0,
          chatMessages: 0,
          featureUsage: {},
        };
      }

      const metrics = metricsByLocale[locale];

      // Count page views
      if (event.category === "navigation" && event.action === "page_view") {
        metrics.pageViews++;
      }

      // Count sessions (unique sessionIds per locale)
      if (event.sessionId) {
        uniqueSessions.add(`${locale}:${event.sessionId}`);
      }

      // Count chat interactions
      if (
        event.category === "conversation" &&
        (event.action === "question_asked" || event.action === "message_sent")
      ) {
        metrics.chatMessages++;
      }

      // Count feature usage
      if (event.category === "education" || event.category === "tools") {
        const feature = event.label || event.action;
        metrics.featureUsage[feature] =
          (metrics.featureUsage[feature] || 0) + 1;
      }
    }

    // Count unique sessions per locale
    for (const sessionKey of uniqueSessions) {
      const [locale] = sessionKey.split(":");
      if (metricsByLocale[locale]) {
        metricsByLocale[locale].sessions++;
      }
    }

    // Generate Prometheus samples
    for (const [locale, metrics] of Object.entries(metricsByLocale)) {
      const localeLabels = { ...instanceLabels, locale };

      // Page views metric
      samples.push({
        name: "telemetry_page_views_total",
        labels: localeLabels,
        value: metrics.pageViews,
        timestamp,
      });

      // Sessions metric
      samples.push({
        name: "telemetry_sessions_total",
        labels: localeLabels,
        value: metrics.sessions,
        timestamp,
      });

      // Chat messages metric
      samples.push({
        name: "telemetry_chat_messages_total",
        labels: localeLabels,
        value: metrics.chatMessages,
        timestamp,
      });

      // Feature usage metrics
      for (const [feature, count] of Object.entries(metrics.featureUsage)) {
        samples.push({
          name: "telemetry_feature_usage_total",
          labels: { ...localeLabels, feature },
          value: count,
          timestamp,
        });
      }
    }

    logger.debug("Telemetry metrics collected", {
      locales: Object.keys(metricsByLocale).length,
      samples: samples.length,
    });

    return samples;
  } catch (error) {
    logger.error("Failed to collect telemetry metrics", {
      error: String(error),
    });
    return [];
  }
}
