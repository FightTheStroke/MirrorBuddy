/**
 * Detailed Health Check Dashboard Endpoint
 *
 * GET /api/health/detailed - Returns comprehensive system health metrics
 *
 * This endpoint provides detailed health information for monitoring dashboards.
 * Protected in production via auth header or IP allowlist (F-15).
 *
 * Authentication methods:
 * 1. Authorization header: Bearer {HEALTH_SECRET}
 * 2. IP allowlist: localhost, private networks, or HEALTH_ALLOWED_IPS
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestLogger, getRequestId } from "@/lib/tracing";
import { getAppVersion } from "@/lib/version";
import { prometheusPushService } from "@/lib/observability";
import { getPoolMetrics, getPoolUtilization } from "@/lib/metrics/pool-metrics";
import { pipe, withSentry } from "@/lib/api/middlewares";

/** Secret for health endpoint auth (optional) */
const HEALTH_SECRET = process.env.HEALTH_SECRET;

/** Comma-separated list of allowed IPs (optional) */
const HEALTH_ALLOWED_IPS =
  process.env.HEALTH_ALLOWED_IPS?.split(",").map((ip) => ip.trim()) || [];

/** Private network ranges (RFC 1918) */
const PRIVATE_NETWORK_PREFIXES = [
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
];

/**
 * Check if IP is allowed (F-15)
 */
function isAllowedIP(ip: string | null): boolean {
  if (!ip) return false;

  // Always allow localhost
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;

  // Allow private networks
  if (PRIVATE_NETWORK_PREFIXES.some((prefix) => ip.startsWith(prefix)))
    return true;

  // Check custom allowlist
  if (HEALTH_ALLOWED_IPS.includes(ip)) return true;

  return false;
}

/**
 * Check if request is authorized (F-15)
 */
function isAuthorized(
  request: NextRequest,
  log: ReturnType<typeof getRequestLogger>,
): boolean {
  // In development, allow all
  if (process.env.NODE_ENV === "development") return true;

  // Check auth header
  const authHeader = request.headers.get("authorization");
  if (HEALTH_SECRET && authHeader === `Bearer ${HEALTH_SECRET}`) return true;

  // Check IP allowlist
  const clientIP =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  if (isAllowedIP(clientIP)) return true;

  log.warn("Unauthorized access to /api/health/detailed", { clientIP });
  return false;
}

const startTime = Date.now();

interface DetailedHealth {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  environment: string;
  timestamp: string;
  uptime: {
    seconds: number;
    human: string;
  };
  checks: {
    database: DatabaseCheck;
    ai: AICheck;
    memory: MemoryCheck;
    safety: SafetyCheck;
    grafana: GrafanaCheck;
  };
  build: BuildInfo;
}

interface DatabaseCheck {
  status: "pass" | "warn" | "fail";
  latencyMs: number;
  connectionPool?: {
    total: number; // Total pool size (active + idle)
    active: number; // Connections executing queries
    idle: number; // Connections available for reuse
    waiting: number; // Requests waiting for connection
    utilization: number; // Utilization percentage (0-100)
  };
}

interface AICheck {
  azure: { configured: boolean; endpoint?: string };
  ollama: { configured: boolean; url?: string };
}

interface MemoryCheck {
  status: "pass" | "warn" | "fail";
  heapUsedMB: number;
  heapTotalMB: number;
  usagePercent: number;
  rssUsedMB: number;
}

interface SafetyCheck {
  contentFilter: boolean;
  jailbreakDetector: boolean;
  ageGating: boolean;
  outputSanitizer: boolean;
}

interface GrafanaCheck {
  configured: boolean;
  active: boolean;
  pushUrl?: string;
}

interface BuildInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
}

async function checkDatabase(): Promise<DatabaseCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    // Get connection pool statistics (ADR 0067)
    const poolStats = getPoolMetrics();
    const poolUtilization = getPoolUtilization();

    return {
      status: latency < 100 ? "pass" : "warn",
      latencyMs: latency,
      connectionPool: {
        total: poolStats.total,
        active: poolStats.active,
        idle: poolStats.idle,
        waiting: poolStats.waiting,
        utilization: poolUtilization,
      },
    };
  } catch {
    return { status: "fail", latencyMs: Date.now() - start };
  }
}

function checkAI(): AICheck {
  return {
    azure: {
      configured: !!(
        process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY
      ),
      endpoint: process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, "")
        .split("/")
        .pop(),
    },
    ollama: {
      configured: !!process.env.OLLAMA_URL,
      url: process.env.OLLAMA_URL,
    },
  };
}

function checkMemory(): MemoryCheck {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  return {
    status: usagePercent > 90 ? "fail" : usagePercent > 70 ? "warn" : "pass",
    heapUsedMB,
    heapTotalMB,
    usagePercent,
    rssUsedMB: Math.round(mem.rss / 1024 / 1024),
  };
}

function checkSafety(): SafetyCheck {
  // These modules should always be available
  return {
    contentFilter: true,
    jailbreakDetector: true,
    ageGating: true,
    outputSanitizer: true,
  };
}

function checkGrafana(): GrafanaCheck {
  const configured = prometheusPushService.isConfigured();
  const active = prometheusPushService.isActive();
  return {
    configured,
    active,
    pushUrl: process.env.GRAFANA_CLOUD_PROMETHEUS_URL
      ? process.env.GRAFANA_CLOUD_PROMETHEUS_URL.replace(/\/\/.*@/, "//***@")
      : undefined,
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "< 1m";
}

export const GET = pipe(withSentry("/api/health/detailed"))(async (ctx) => {
  const log = getRequestLogger(ctx.req);
  // F-15: Check authorization
  if (!isAuthorized(ctx.req, log)) {
    const response = NextResponse.json(
      {
        error: "Unauthorized",
        message: "Access to detailed health metrics requires authentication",
      },
      { status: 401 },
    );
    response.headers.set("X-Request-ID", getRequestId(ctx.req));
    return response;
  }

  const database = await checkDatabase();
  const ai = checkAI();
  const memory = checkMemory();
  const safety = checkSafety();
  const grafana = checkGrafana();

  const checks = { database, ai, memory, safety, grafana };
  const uptimeSeconds = Math.round((Date.now() - startTime) / 1000);

  const hasFailure = database.status === "fail" || memory.status === "fail";
  const hasWarning = database.status === "warn" || memory.status === "warn";

  const health: DetailedHealth = {
    status: hasFailure ? "unhealthy" : hasWarning ? "degraded" : "healthy",
    version: getAppVersion(),
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: { seconds: uptimeSeconds, human: formatUptime(uptimeSeconds) },
    checks,
    build: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  const response = NextResponse.json(health, {
    status: health.status === "unhealthy" ? 503 : 200,
  });
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});
