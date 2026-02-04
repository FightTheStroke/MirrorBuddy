/**
 * Dependency Analysis Cron Job
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * ADR 0115 - Amodei Safety Enhancements
 *
 * Analyzes user patterns for signs of AI dependency.
 * Runs daily via Vercel Cron (0 4 * * * = 4 AM UTC)
 */

import { pipe, withSentry, withCron } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { runDependencyAnalysis } from "@/lib/safety/dependency";

const log = logger.child({ module: "cron-dependency-analysis" });

interface CronResponse {
  status: "success" | "error";
  timestamp: string;
  duration_ms: number;
  summary: {
    users_analyzed: number;
    alerts_generated: number;
    alerts_by_severity: {
      warning: number;
      concern: number;
      critical: number;
    };
    errors: string[];
  };
}

export const POST = pipe(
  withSentry("/api/cron/dependency-analysis"),
  withCron,
)(async () => {
  const startTime = Date.now();
  const response: CronResponse = {
    status: "success",
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    summary: {
      users_analyzed: 0,
      alerts_generated: 0,
      alerts_by_severity: { warning: 0, concern: 0, critical: 0 },
      errors: [],
    },
  };

  // Skip in non-production environments
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    log.info(
      `[CRON] Skipping dependency-analysis - not production (env: ${process.env.VERCEL_ENV})`,
    );
    return Response.json(
      {
        skipped: true,
        reason: "Not production environment",
        environment: process.env.VERCEL_ENV,
      },
      { status: 200 },
    );
  }

  log.info("Dependency analysis cron job started");

  // Find users with activity in the last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const activeUsers = await prisma.usagePattern.findMany({
    where: {
      date: { gte: yesterday },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  log.info("Found active users for analysis", { count: activeUsers.length });

  // Analyze each user
  for (const { userId } of activeUsers) {
    try {
      const result = await runDependencyAnalysis(userId);
      response.summary.users_analyzed += 1;

      const totalAlerts = result.alerts.length + result.weeklyAlerts.length;
      response.summary.alerts_generated += totalAlerts;

      // Count by severity
      for (const alert of [...result.alerts, ...result.weeklyAlerts]) {
        if (alert.severity === "warning") {
          response.summary.alerts_by_severity.warning += 1;
        } else if (alert.severity === "concern") {
          response.summary.alerts_by_severity.concern += 1;
        } else if (alert.severity === "critical") {
          response.summary.alerts_by_severity.critical += 1;
        }
      }

      if (totalAlerts > 0) {
        log.info("User dependency alerts created", {
          userId: userId.slice(0, 8),
          alerts: totalAlerts,
          anomaly: result.isAnomaly,
          sigma: result.sigmaDeviation?.toFixed(2),
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error("Failed to analyze user", {
        userId: userId.slice(0, 8),
        error: errorMsg,
      });
      response.summary.errors.push(`User ${userId.slice(0, 8)}: ${errorMsg}`);
    }
  }

  response.duration_ms = Date.now() - startTime;

  // Determine overall status
  if (response.summary.errors.length > 0) {
    response.status = "error";
    log.warn("Dependency analysis cron completed with errors", {
      errors: response.summary.errors.length,
      duration_ms: response.duration_ms,
    });
    return Response.json(response, { status: 207 });
  }

  log.info("Dependency analysis cron completed", {
    duration_ms: response.duration_ms,
    users_analyzed: response.summary.users_analyzed,
    alerts_generated: response.summary.alerts_generated,
    critical: response.summary.alerts_by_severity.critical,
    concern: response.summary.alerts_by_severity.concern,
    warning: response.summary.alerts_by_severity.warning,
  });

  return Response.json(response, { status: 200 });
});

// Vercel Cron uses GET by default
export const GET = POST;
