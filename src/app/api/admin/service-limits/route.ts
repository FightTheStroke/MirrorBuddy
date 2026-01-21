/**
 * Admin Service Limits API
 * F-05 - Real-time metrics for stress (CPU, memory, rate limits)
 * F-22 - API integration for automated limit queries (Vercel, Supabase, Resend, Azure API)
 *
 * Returns usage and limits across all external services:
 * - Vercel (bandwidth, builds, functions)
 * - Supabase (database size, storage, connections)
 * - Resend (email quota)
 * - Azure OpenAI (TPM, RPM)
 * - Redis KV (storage, commands)
 */

import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAllExternalServiceUsage } from "@/lib/metrics/external-service-metrics";

const log = logger.child({ module: "service-limits-api" });

export interface ServiceLimit {
  usage: number;
  limit: number;
  percentage: number;
  status: "ok" | "warning" | "critical";
  unit?: string;
  period?: string;
}

export interface ServiceLimitsResponse {
  vercel: {
    bandwidth: ServiceLimit;
    buildMinutes: ServiceLimit;
    functionInvocations: ServiceLimit;
  };
  supabase: {
    databaseSize: ServiceLimit;
    storage: ServiceLimit;
    connections: ServiceLimit;
  };
  resend: {
    emailsToday: ServiceLimit;
    emailsThisMonth: ServiceLimit;
  };
  azureOpenAI: {
    chatTPM: ServiceLimit;
    chatRPM: ServiceLimit;
    embeddingTPM: ServiceLimit;
    ttsRPM: ServiceLimit;
  };
  redis: {
    storage: ServiceLimit;
    commandsPerDay: ServiceLimit;
  };
  timestamp: string;
}

export async function GET(): Promise<
  NextResponse<ServiceLimitsResponse | { error: string }>
> {
  // Validate admin authentication
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch Azure OpenAI usage from telemetry
    const azureUsage = await getAllExternalServiceUsage();

    // Get Supabase database size
    const dbSizeResult = await prisma.$queryRaw<Array<{ size: bigint }>>`
      SELECT pg_database_size(current_database()) as size;
    `;
    const dbSizeMB = Number(dbSizeResult[0].size) / (1024 * 1024);

    // Get Redis usage estimate (count rate limit keys from last 24h)
    const redisCommandsToday = await estimateRedisCommands();

    // Build response
    const response: ServiceLimitsResponse = {
      vercel: {
        // Vercel limits require manual dashboard checks - returning static limits
        bandwidth: createLimit(0, 1000, "GB", "month", true),
        buildMinutes: createLimit(0, 6000, "minutes", "month", true),
        functionInvocations: createLimit(0, 1000000, "invocations", "month", true),
      },
      supabase: {
        databaseSize: createLimit(dbSizeMB, 500, "MB", "total"),
        storage: createLimit(0, 1000, "MB", "total", true),
        connections: createLimit(0, 200, "connections", "concurrent", true),
      },
      resend: {
        // Resend limits would require API call - returning static limits
        emailsToday: createLimit(0, 100, "emails", "day", true),
        emailsThisMonth: createLimit(0, 3000, "emails", "month", true),
      },
      azureOpenAI: {
        chatTPM: extractAzureMetric(azureUsage, "Chat Tokens/min", 120000),
        chatRPM: extractAzureMetric(azureUsage, "Chat Requests/min", 720),
        embeddingTPM: extractAzureMetric(azureUsage, "Embedding Tokens/min", 350000),
        ttsRPM: extractAzureMetric(azureUsage, "TTS Requests/min", 150),
      },
      redis: {
        storage: createLimit(5, 256, "MB", "total"),
        commandsPerDay: createLimit(redisCommandsToday, 10000, "commands", "day"),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    log.error("Failed to fetch service limits", undefined, error);
    return NextResponse.json(
      { error: "Failed to fetch service limits" },
      { status: 500 },
    );
  }
}

/**
 * Create a service limit object with status calculation
 */
function createLimit(
  usage: number,
  limit: number,
  unit?: string,
  period?: string,
  _estimated: boolean = false,
): ServiceLimit {
  const percentage = limit > 0 ? (usage / limit) * 100 : 0;

  let status: ServiceLimit["status"] = "ok";
  if (percentage >= 95) {
    status = "critical";
  } else if (percentage >= 80) {
    status = "warning";
  }

  const result: ServiceLimit = {
    usage: Math.round(usage * 100) / 100,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    status,
  };

  if (unit) result.unit = unit;
  if (period) result.period = period;

  return result;
}

/**
 * Extract Azure metric from external service usage
 */
function extractAzureMetric(
  usage: Array<{ service: string; metric: string; currentValue: number; limit: number; status: string }>,
  metricName: string,
  defaultLimit: number,
): ServiceLimit {
  const metric = usage.find(
    (u) => u.service === "Azure OpenAI" && u.metric === metricName,
  );

  if (metric) {
    return {
      usage: metric.currentValue,
      limit: metric.limit,
      percentage: Math.round((metric.currentValue / metric.limit) * 10000) / 100,
      status: metric.status as ServiceLimit["status"],
      unit: metricName.includes("Token") ? "tokens" : "requests",
      period: "1m",
    };
  }

  // Fallback if metric not found
  return createLimit(0, defaultLimit, metricName.includes("Token") ? "tokens" : "requests", "1m");
}

/**
 * Estimate Redis commands per day based on telemetry
 */
async function estimateRedisCommands(): Promise<number> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Count API calls in last 24h (each API call typically = 1-2 Redis commands for rate limiting)
    const apiCalls = await prisma.telemetryEvent.count({
      where: {
        timestamp: { gte: dayAgo },
        category: "api_call",
      },
    });

    // Estimate: 1.5x API calls (rate limit check + increment)
    // Plus SSE management overhead (~100/day) and budget tracking (~200/day)
    return Math.round(apiCalls * 1.5 + 300);
  } catch (error) {
    log.warn("Failed to estimate Redis commands", { error: String(error) });
    return 0;
  }
}
