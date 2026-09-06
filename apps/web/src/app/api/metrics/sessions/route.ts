/**
 * Session Metrics API
 *
 * Receives session metric events from useSessionMetrics hook.
 * All token counts are REAL data from API responses.
 */

import { NextResponse } from 'next/server';
import { getRequestLogger, getRequestId } from '@/lib/tracing';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { safeReadJson } from '@/lib/api/safe-json';
import { sessionMetricSchema } from '@/lib/telemetry/ingestion-contract';
import {
  canCollectOptionalAnalytics,
  optionalAnalyticsDenied,
} from '@/lib/telemetry/optional-analytics-server';
import { getSessionState, discardSessionsForUser } from '@/lib/metrics/session-metrics-service';
import {
  startSession,
  recordTurn,
  recordVoiceUsage,
  recordRefusal,
  recordIncident,
  endSession,
} from '@/lib/metrics';

export const revalidate = 0;
export const POST = pipe(
  withSentry('/api/metrics/sessions'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const log = getRequestLogger(ctx.req);
  if (!(await canCollectOptionalAnalytics(ctx.userId))) {
    discardSessionsForUser(ctx.userId);
    return optionalAnalyticsDenied();
  }
  const parsed = sessionMetricSchema.safeParse(await safeReadJson(ctx.req));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid session metric' }, { status: 400 });
  const body = parsed.data;
  const { action, sessionId } = body;
  const existing = getSessionState(sessionId);
  if (existing && existing.userId !== ctx.userId) {
    return NextResponse.json({ error: 'Session owner mismatch' }, { status: 403 });
  }
  if (!existing && action !== 'start') {
    return NextResponse.json({ error: 'Unknown metrics session' }, { status: 404 });
  }

  switch (action) {
    case 'start':
      startSession(sessionId, ctx.userId!);
      log.debug('Session metrics started', { sessionId });
      break;

    case 'turn':
      recordTurn(sessionId, body.turn);
      break;

    case 'voice':
      recordVoiceUsage(sessionId, body.minutes);
      break;

    case 'refusal':
      recordRefusal(sessionId, body.wasCorrect);
      break;

    case 'incident':
      recordIncident(sessionId, body.severity);
      break;

    case 'end':
      await endSession(sessionId);
      log.debug('Session metrics ended', { sessionId });
      break;

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400, headers: { 'X-Request-ID': getRequestId(ctx.req) } },
      );
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});

/**
 * GET: Retrieve session metrics summary
 */
export const GET = pipe(
  withSentry('/api/metrics/sessions'),
  withAuth,
)(async (ctx) => {
  const { getCostMetricsSummary, getCostStats } = await import('@/lib/metrics');

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
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});
