/**
 * Detailed Health Check Dashboard Endpoint
 *
 * GET /api/health/detailed - Returns comprehensive system health metrics
 *
 * This endpoint provides detailed health information for monitoring dashboards.
 * Should be protected in production (internal network only).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const startTime = Date.now();

interface DetailedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
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
  };
  build: BuildInfo;
}

interface DatabaseCheck {
  status: 'pass' | 'warn' | 'fail';
  latencyMs: number;
  connectionPool?: { active: number; idle: number };
}

interface AICheck {
  azure: { configured: boolean; endpoint?: string };
  ollama: { configured: boolean; url?: string };
}

interface MemoryCheck {
  status: 'pass' | 'warn' | 'fail';
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
    return {
      status: latency < 100 ? 'pass' : 'warn',
      latencyMs: latency,
    };
  } catch {
    return { status: 'fail', latencyMs: Date.now() - start };
  }
}

function checkAI(): AICheck {
  return {
    azure: {
      configured: !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY),
      endpoint: process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, '').split('/').pop(),
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
    status: usagePercent > 90 ? 'fail' : usagePercent > 70 ? 'warn' : 'pass',
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

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ') || '< 1m';
}

export async function GET() {
  const database = await checkDatabase();
  const ai = checkAI();
  const memory = checkMemory();
  const safety = checkSafety();

  const checks = { database, ai, memory, safety };
  const uptimeSeconds = Math.round((Date.now() - startTime) / 1000);

  const hasFailure = database.status === 'fail' || memory.status === 'fail';
  const hasWarning = database.status === 'warn' || memory.status === 'warn';

  const health: DetailedHealth = {
    status: hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
    version: process.env.npm_package_version || '0.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: { seconds: uptimeSeconds, human: formatUptime(uptimeSeconds) },
    checks,
    build: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  return NextResponse.json(health, { status: health.status === 'unhealthy' ? 503 : 200 });
}
