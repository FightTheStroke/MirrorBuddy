/**
 * Voice usage ingestion.
 *
 * The client forwards the usage block Azure sends on every `response.done`.
 * The user is taken from the session, never from the body: a cost report is
 * only worth having if nobody can bill someone else's conversation to another
 * account.
 */

import { NextResponse } from 'next/server';
import { getRequestId, getRequestLogger } from '@/lib/tracing';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { recordVoiceUsage } from '@/lib/metrics/voice-usage-service';
import { resolveVoiceModel } from '@/lib/metrics/voice-model';

export const revalidate = 0;

interface VoiceUsageRequest {
  sessionId?: string;
  maestroId?: string;
  model?: string;
  usage?: unknown;
}

export const POST = pipe(
  withSentry('/api/metrics/voice-usage'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const log = getRequestLogger(ctx.req);
  const headers = { 'X-Request-ID': getRequestId(ctx.req) };

  let body: VoiceUsageRequest;
  try {
    body = (await ctx.req.json()) as VoiceUsageRequest;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400, headers });
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400, headers });
  }

  // The browser does not get to name the model: `response.done` frequently
  // omits it, and a client default would price every turn at the premium rate.
  const model = await resolveVoiceModel(body.model ?? null);

  const recorded = await recordVoiceUsage({
    userId: ctx.userId!,
    sessionId: body.sessionId,
    maestroId: body.maestroId ?? null,
    model,
    usage: body.usage,
  });

  if (recorded) {
    log.debug('Voice usage recorded', { sessionId: body.sessionId, costEur: recorded.costEur });
  }

  // A turn that cost nothing, or a row we failed to store, is still a
  // successful request: the conversation must never be disturbed by accounting.
  return NextResponse.json({ success: true, costEur: recorded?.costEur ?? 0 }, { headers });
});
