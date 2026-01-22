// ============================================================================
// HEALTH CHECK API
// Returns system health status for monitoring and deployment verification
// ISE Engineering Fundamentals: https://microsoft.github.io/code-with-engineering-playbook/
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppVersion } from "@/lib/version";

// Track server start time for uptime calculation
const startTime = Date.now();

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    ai_provider: CheckResult;
    memory: CheckResult;
  };
}

interface CheckResult {
  status: "pass" | "fail" | "warn";
  message: string;
  latency_ms?: number;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Simple query to verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    // 1000ms threshold accounts for Vercel serverless cold starts
    // (TLS handshake + connection pooling can take 300-800ms on first request)
    // Increased from 500ms to 1000ms to avoid false warnings (ADR 0065)
    return {
      status: latency < 1000 ? "pass" : "warn",
      message: latency < 1000 ? "Connected" : "Slow response",
      latency_ms: latency,
    };
  } catch (error) {
    return {
      status: "fail",
      message: error instanceof Error ? error.message : "Connection failed",
      latency_ms: Date.now() - start,
    };
  }
}

async function checkAIProvider(): Promise<CheckResult> {
  const azureConfigured = !!(
    process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY
  );

  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

  if (azureConfigured) {
    return {
      status: "pass",
      message: "Azure OpenAI configured",
    };
  }

  // Check if Ollama is available as fallback
  try {
    const start = Date.now();
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });

    if (response.ok) {
      return {
        status: "pass",
        message: "Ollama available",
        latency_ms: Date.now() - start,
      };
    }

    return {
      status: "fail",
      message: "No AI provider configured or available",
    };
  } catch {
    return {
      status: "fail",
      message: "No AI provider configured or available",
    };
  }
}

function checkMemory(): CheckResult {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const usagePercent = Math.round((used.heapUsed / used.heapTotal) * 100);

  let status: "pass" | "warn" | "fail" = "pass";

  // Vercel serverless functions start with small heap (~30MB)
  // Use absolute thresholds for small heaps, percentage for larger ones
  const isServerlessSmallHeap = heapTotalMB < 100;

  if (isServerlessSmallHeap) {
    // For serverless: warn at 200MB, fail at 400MB absolute
    if (heapUsedMB > 400) {
      status = "fail";
    } else if (heapUsedMB > 200) {
      status = "warn";
    }
  } else {
    // For larger heaps: use percentage thresholds
    if (usagePercent > 90) {
      status = "fail";
    } else if (usagePercent > 70) {
      status = "warn";
    }
  }

  return {
    status,
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
  };
}

function getOverallStatus(
  checks: HealthCheck["checks"],
): HealthCheck["status"] {
  const results = Object.values(checks);

  if (results.some((c) => c.status === "fail")) {
    return "unhealthy";
  }
  if (results.some((c) => c.status === "warn")) {
    return "degraded";
  }
  return "healthy";
}

export async function GET() {
  const [database, ai_provider] = await Promise.all([
    checkDatabase(),
    checkAIProvider(),
  ]);

  const memory = checkMemory();

  const checks = { database, ai_provider, memory };
  const status = getOverallStatus(checks);

  const health: HealthCheck = {
    status,
    version: getAppVersion(),
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  };

  // Return 503 if unhealthy (for load balancer health checks)
  const httpStatus = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, { status: httpStatus });
}

// HEAD request for simple alive check (used by load balancers)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
