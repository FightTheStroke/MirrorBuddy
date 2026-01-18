/**
 * Cost Tracking Service
 *
 * Tracks and enforces cost budgets per V1Plan FASE 6.2.
 *
 * PRICING SOURCE: docs/busplan/VoiceCostAnalysis-2026-01-02.md
 * - Text (GPT-4o-mini): $0.15/1M input + $0.60/1M output ≈ €0.002/1K average
 * - Voice (gpt-realtime-mini): ~€0.04/min
 * - Voice (gpt-realtime): ~€0.30/min
 *
 * TOKEN DATA: Real token counts come from Azure OpenAI API responses
 * (prompt_tokens, completion_tokens, total_tokens) stored in SessionMetrics.
 *
 * COST CALCULATION: Based on REAL token counts from API, not estimates.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Pricing constants (EUR) - SOURCE: V1Plan.md + VoiceCostAnalysis-2026-01-02.md
 * Last updated: January 2026 (Azure OpenAI pricing)
 */
const PRICING = {
  // GPT-4o-mini: $0.15/1M input + $0.60/1M output ≈ $0.002/1K average ≈ €0.002/1K
  TEXT_PER_1K_TOKENS: 0.002,
  // gpt-realtime-mini: ~$0.03-0.05/min ≈ €0.04/min (conservative estimate)
  VOICE_REALTIME_PER_MIN: 0.04,
  // Embeddings: text-embedding-3-small $0.02/1M ≈ €0.00002/1K
  EMBEDDINGS_PER_1K_TOKENS: 0.00002,
} as const;

// Budget thresholds from V1Plan
const THRESHOLDS = {
  SESSION_TEXT_WARN: 0.05, // €0.05 warning
  SESSION_TEXT_LIMIT: 0.1, // €0.10 NO-GO
  SESSION_VOICE_WARN: 0.15, // €0.15 warning
  SESSION_VOICE_LIMIT: 0.3, // €0.30 NO-GO
  DAILY_USER_LIMIT: 5.0, // €5 per user per day
  SPIKE_MULTIPLIER: 1.5, // P95 * 1.5 = spike
} as const;

export interface CostBreakdown {
  textCost: number;
  voiceCost: number;
  embeddingsCost: number;
  totalCost: number;
}

/**
 * Usage data for cost calculation.
 * All values come from REAL API responses stored in SessionMetrics.
 * - tokensIn/tokensOut: from Azure OpenAI API (prompt_tokens, completion_tokens)
 * - voiceMinutes: from Realtime API session duration
 * - embeddingTokens: from embedding API responses
 */
export interface UsageData {
  tokensIn: number;
  tokensOut: number;
  voiceMinutes: number; // Realtime API handles audio I/O with single per-minute rate
  embeddingTokens: number;
}

export type CostStatus = "ok" | "warning" | "exceeded";

/**
 * Calculate cost breakdown from REAL usage data.
 * Input: actual token counts from API responses (not estimates).
 */
export function calculateCost(usage: Partial<UsageData>): CostBreakdown {
  const tokensIn = usage.tokensIn || 0;
  const tokensOut = usage.tokensOut || 0;
  const voiceMinutes = usage.voiceMinutes || 0;
  const embeddingTokens = usage.embeddingTokens || 0;

  // Text cost: based on REAL token counts from Azure API
  const textCost = ((tokensIn + tokensOut) / 1000) * PRICING.TEXT_PER_1K_TOKENS;

  // Voice cost: Realtime API charges per-minute (includes audio I/O)
  const voiceCost = voiceMinutes * PRICING.VOICE_REALTIME_PER_MIN;

  // Embeddings cost: based on REAL token counts from embedding API
  const embeddingsCost =
    (embeddingTokens / 1000) * PRICING.EMBEDDINGS_PER_1K_TOKENS;

  return {
    textCost: round(textCost),
    voiceCost: round(voiceCost),
    embeddingsCost: round(embeddingsCost),
    totalCost: round(textCost + voiceCost + embeddingsCost),
  };
}

/**
 * Check session cost against thresholds
 */
export function checkSessionCost(
  cost: number,
  hasVoice: boolean,
): { status: CostStatus; message?: string } {
  const warnThreshold = hasVoice
    ? THRESHOLDS.SESSION_VOICE_WARN
    : THRESHOLDS.SESSION_TEXT_WARN;
  const limitThreshold = hasVoice
    ? THRESHOLDS.SESSION_VOICE_LIMIT
    : THRESHOLDS.SESSION_TEXT_LIMIT;

  if (cost >= limitThreshold) {
    return {
      status: "exceeded",
      message: `Session cost €${cost.toFixed(2)} exceeds limit €${limitThreshold.toFixed(2)}`,
    };
  }

  if (cost >= warnThreshold) {
    return {
      status: "warning",
      message: `Session cost €${cost.toFixed(2)} approaching limit`,
    };
  }

  return { status: "ok" };
}

/**
 * Get user's daily spending
 */
export async function getUserDailyCost(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.sessionMetrics.aggregate({
    where: {
      userId,
      createdAt: { gte: today },
    },
    _sum: { costEur: true },
  });

  return result._sum.costEur || 0;
}

/**
 * Check if user has exceeded daily budget
 */
export async function checkUserDailyBudget(
  userId: string,
): Promise<{ status: CostStatus; spent: number; remaining: number }> {
  const spent = await getUserDailyCost(userId);
  const remaining = Math.max(0, THRESHOLDS.DAILY_USER_LIMIT - spent);

  if (spent >= THRESHOLDS.DAILY_USER_LIMIT) {
    logger.warn("User daily budget exceeded", { userId, spent });
    return { status: "exceeded", spent, remaining: 0 };
  }

  if (spent >= THRESHOLDS.DAILY_USER_LIMIT * 0.8) {
    return { status: "warning", spent, remaining };
  }

  return { status: "ok", spent, remaining };
}

/**
 * Get aggregate cost stats for a time period
 */
export async function getCostStats(
  from: Date,
  to: Date,
): Promise<{
  totalCost: number;
  avgCostPerSession: number;
  sessionCount: number;
  p95Cost: number;
}> {
  const metrics = await prisma.sessionMetrics.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: { costEur: true },
    orderBy: { costEur: "asc" },
  });

  if (metrics.length === 0) {
    return { totalCost: 0, avgCostPerSession: 0, sessionCount: 0, p95Cost: 0 };
  }

  const costs = metrics.map((m: { costEur: number }) => m.costEur);
  const totalCost = costs.reduce((sum: number, c: number) => sum + c, 0);
  const avgCostPerSession = totalCost / costs.length;
  const p95Index = Math.floor(costs.length * 0.95);
  const p95Cost = costs[p95Index] || costs[costs.length - 1];

  return {
    totalCost: round(totalCost),
    avgCostPerSession: round(avgCostPerSession),
    sessionCount: metrics.length,
    p95Cost: round(p95Cost),
  };
}

/**
 * Detect cost spike (session cost > P95 * 1.5)
 */
export async function detectCostSpike(sessionCost: number): Promise<boolean> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stats = await getCostStats(weekAgo, new Date());

  if (stats.sessionCount < 10) {
    // Not enough data for spike detection
    return false;
  }

  const spikeThreshold = stats.p95Cost * THRESHOLDS.SPIKE_MULTIPLIER;
  return sessionCost > spikeThreshold;
}

/**
 * Get cost summary for Grafana metrics
 */
export async function getCostMetricsSummary(): Promise<{
  avgCostText24h: number;
  avgCostVoice24h: number;
  spikesThisWeek: number;
  totalCost24h: number;
  sessionCount24h: number;
}> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get 24h metrics split by voice/text
  const textSessions = await prisma.sessionMetrics.aggregate({
    where: { createdAt: { gte: dayAgo }, voiceMinutes: 0 },
    _avg: { costEur: true },
  });

  const voiceSessions = await prisma.sessionMetrics.aggregate({
    where: { createdAt: { gte: dayAgo }, voiceMinutes: { gt: 0 } },
    _avg: { costEur: true },
  });

  // Get 24h totals
  const dayStats = await getCostStats(dayAgo, new Date());

  // Count spikes this week
  const weekStats = await getCostStats(weekAgo, new Date());
  const spikeThreshold = weekStats.p95Cost * THRESHOLDS.SPIKE_MULTIPLIER;

  const spikeSessions = await prisma.sessionMetrics.count({
    where: {
      createdAt: { gte: weekAgo },
      costEur: { gt: spikeThreshold > 0 ? spikeThreshold : 999 },
    },
  });

  // Return REAL data only - no fallback assumptions
  return {
    avgCostText24h: round(textSessions._avg.costEur || 0),
    avgCostVoice24h: round(voiceSessions._avg.costEur || 0),
    spikesThisWeek: spikeSessions,
    totalCost24h: round(dayStats.totalCost),
    sessionCount24h: dayStats.sessionCount,
  };
}

// Helper to round to 3 decimal places
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Export thresholds for use in UI
export { THRESHOLDS, PRICING };
