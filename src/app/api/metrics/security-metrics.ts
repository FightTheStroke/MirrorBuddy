/**
 * Security Infrastructure Metrics
 *
 * Tracks security-related infrastructure issues:
 * - SSL/TLS configuration issues
 * - Environment validation failures
 * - Authentication anomalies
 */

import { prisma } from "@/lib/db";

interface MetricLine {
  name: string;
  type: "counter" | "gauge" | "histogram";
  help: string;
  labels: Record<string, string>;
  value: number;
}

// In-memory counter for security events (reset on deploy)
// For persistent tracking, these would go to TelemetryEvent table
const securityCounters = {
  ssl_verification_disabled: 0,
  env_validation_failed: 0,
  auth_anomaly: 0,
};

/**
 * Increment a security counter (called from affected code paths)
 */
export function incrementSecurityCounter(
  type: keyof typeof securityCounters,
): void {
  securityCounters[type]++;
}

/**
 * Generate security infrastructure metrics
 */
export async function generateSecurityMetrics(): Promise<MetricLine[]> {
  const metrics: MetricLine[] = [];
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // In-memory security counters (current instance)
  for (const [type, count] of Object.entries(securityCounters)) {
    metrics.push({
      name: "mirrorbuddy_security_issues_total",
      type: "counter",
      help: "Security infrastructure issues by type",
      labels: { type, scope: "instance" },
      value: count,
    });
  }

  // Database-tracked security events (persistent across deploys)
  try {
    const securityEvents = await prisma.telemetryEvent.groupBy({
      by: ["action"],
      where: {
        category: "security",
        timestamp: { gte: dayAgo },
      },
      _count: true,
    });

    for (const event of securityEvents) {
      metrics.push({
        name: "mirrorbuddy_security_events_total",
        type: "counter",
        help: "Security events from telemetry (24h)",
        labels: { action: event.action, period: "24h" },
        value: event._count,
      });
    }
  } catch {
    // Database may not be available during build
  }

  // SSL configuration status (1 = secure, 0 = insecure)
  const sslSecure = process.env.SUPABASE_CA_CERT ? 1 : 0;
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  metrics.push({
    name: "mirrorbuddy_ssl_verification_enabled",
    type: "gauge",
    help: "SSL certificate verification status (1=enabled, 0=disabled)",
    labels: { environment: isProduction ? "production" : "development" },
    value: sslSecure,
  });

  // Environment validation status
  const envComplete = Boolean(
    process.env.DATABASE_URL && (!isProduction || process.env.SUPABASE_CA_CERT),
  );

  metrics.push({
    name: "mirrorbuddy_env_validation_status",
    type: "gauge",
    help: "Environment variables validation status (1=valid, 0=invalid)",
    labels: { environment: isProduction ? "production" : "development" },
    value: envComplete ? 1 : 0,
  });

  return metrics;
}
