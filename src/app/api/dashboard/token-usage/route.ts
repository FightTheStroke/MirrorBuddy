// ============================================================================
// API ROUTE: Token Usage Analytics
// GET: AI token usage statistics for dashboard
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/dashboard/token-usage"),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // F-06: Exclude test data from token usage statistics
  // Get token usage from telemetry events
  const tokenEvents = await prisma.telemetryEvent.findMany({
    where: {
      category: "ai",
      action: {
        in: ["chat_completion", "voice_transcription", "tts_generation"],
      },
      timestamp: { gte: startDate },
      isTestData: false,
    },
    select: {
      action: true,
      value: true,
      timestamp: true,
      metadata: true,
    },
    orderBy: { timestamp: "desc" },
  });

  // Aggregate by action type
  const byAction: Record<string, { count: number; totalTokens: number }> = {};
  let totalTokens = 0;
  let totalCalls = 0;

  for (const event of tokenEvents) {
    const action = event.action;
    if (!byAction[action]) {
      byAction[action] = { count: 0, totalTokens: 0 };
    }
    byAction[action].count++;
    byAction[action].totalTokens += event.value || 0;
    totalTokens += event.value || 0;
    totalCalls++;
  }

  // Daily breakdown
  const dailyUsage: Record<string, number> = {};
  for (const event of tokenEvents) {
    const day = event.timestamp.toISOString().split("T")[0];
    dailyUsage[day] = (dailyUsage[day] || 0) + (event.value || 0);
  }

  // Estimated cost (rough estimate based on GPT-4 pricing)
  // Input: $0.03/1K, Output: $0.06/1K - average $0.045/1K
  const estimatedCost = (totalTokens / 1000) * 0.045;

  return NextResponse.json({
    period: { days, startDate: startDate.toISOString() },
    summary: {
      totalTokens,
      totalCalls,
      avgTokensPerCall:
        totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0,
      estimatedCostUsd: Math.round(estimatedCost * 100) / 100,
    },
    byAction,
    dailyUsage,
  });
});
