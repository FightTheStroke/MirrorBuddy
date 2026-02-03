/**
 * Session Metrics API
 *
 * Receives session metric events from useSessionMetrics hook.
 * All token counts are REAL data from API responses.
 */

import { NextResponse } from "next/server";
import { getRequestLogger, getRequestId } from "@/lib/tracing";
import { pipe, withSentry, withCSRF } from "@/lib/api/middlewares";
import {
  startSession,
  recordTurn,
  recordVoiceUsage,
  recordRefusal,
  recordIncident,
  endSession,
} from "@/lib/metrics";

type MetricsAction =
  | "start"
  | "end"
  | "turn"
  | "voice"
  | "refusal"
  | "incident";

interface MetricsRequest {
  action: MetricsAction;
  sessionId: string;
  userId?: string;
  turn?: {
    latencyMs: number;
    intent?: string;
    tokensIn: number;
    tokensOut: number;
  };
  minutes?: number;
  wasCorrect?: boolean;
  severity?: "S0" | "S1" | "S2" | "S3";
}

export const POST = pipe(
  withSentry("/api/metrics/sessions"),
  withCSRF,
)(async (ctx) => {
  const log = getRequestLogger(ctx.req);
  const body: MetricsRequest = await ctx.req.json();
  const { action, sessionId } = body;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required" },
      { status: 400, headers: { "X-Request-ID": getRequestId(ctx.req) } },
    );
  }

  switch (action) {
    case "start":
      if (!body.userId) {
        return NextResponse.json(
          { error: "userId required for start" },
          { status: 400, headers: { "X-Request-ID": getRequestId(ctx.req) } },
        );
      }
      startSession(sessionId, body.userId);
      log.debug("Session metrics started", { sessionId });
      break;

    case "turn":
      if (!body.turn) {
        return NextResponse.json(
          { error: "turn data required" },
          { status: 400, headers: { "X-Request-ID": getRequestId(ctx.req) } },
        );
      }
      recordTurn(sessionId, body.turn);
      break;

    case "voice":
      if (typeof body.minutes !== "number") {
        return NextResponse.json(
          { error: "minutes required for voice" },
          { status: 400, headers: { "X-Request-ID": getRequestId(ctx.req) } },
        );
      }
      recordVoiceUsage(sessionId, body.minutes);
      break;

    case "refusal":
      if (typeof body.wasCorrect !== "boolean") {
        return NextResponse.json(
          { error: "wasCorrect required for refusal" },
          { status: 400, headers: { "X-Request-ID": getRequestId(ctx.req) } },
        );
      }
      recordRefusal(sessionId, body.wasCorrect);
      break;

    case "incident":
      if (!body.severity) {
        return NextResponse.json(
          { error: "severity required for incident" },
          { status: 400, headers: { "X-Request-ID": getRequestId(ctx.req) } },
        );
      }
      recordIncident(sessionId, body.severity);
      break;

    case "end":
      await endSession(sessionId);
      log.debug("Session metrics ended", { sessionId });
      break;

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400, headers: { "X-Request-ID": getRequestId(ctx.req) } },
      );
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});

/**
 * GET: Retrieve session metrics summary
 */
export const GET = pipe(withSentry("/api/metrics/sessions"))(async (ctx) => {
  const { getCostMetricsSummary, getCostStats } = await import("@/lib/metrics");

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [costSummary, dailyStats, weeklyStats] = await Promise.all([
    getCostMetricsSummary(),
    getCostStats(dayAgo, new Date()),
    getCostStats(weekAgo, new Date()),
  ]);

  const response = NextResponse.json({
    cost: costSummary,
    daily: dailyStats,
    weekly: weeklyStats,
  });
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});
