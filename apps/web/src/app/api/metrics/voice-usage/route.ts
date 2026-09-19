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
import { isVoiceUsageId } from '@/lib/metrics/voice-usage-validation';
import { VoiceUsageConflictError } from '@/lib/metrics/voice-usage-identity';
import { validateSessionOwnership } from '@/lib/auth/session-auth';

export const revalidate = 0;

interface VoiceUsageRequest {
  sessionId?: string;
  responseId?: string;
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

  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !isVoiceUsageId(body.sessionId) ||
    ('responseId' in body && !isVoiceUsageId(body.responseId)) ||
    !body.usage ||
    typeof body.usage !== 'object' ||
    Array.isArray(body.usage) ||
    (body.model != null && (typeof body.model !== 'string' || body.model.length > 200)) ||
    (body.maestroId != null && !isVoiceUsageId(body.maestroId))
  ) {
    return NextResponse.json({ error: 'invalid voice usage report' }, { status: 400, headers });
  }
  if (body.responseId === undefined)
    log.warn('Legacy voice usage report without response identity; not deduplicated');
  if (!(await validateSessionOwnership(body.sessionId, ctx.userId!)))
    return NextResponse.json({ error: 'session not owned by user' }, { status: 403, headers });

  // The browser does not get to name the model: `response.done` frequently
  // omits it, and a client default would price every turn at the premium rate.
  const model = await resolveVoiceModel(body.model ?? null);

  try {
    const recorded = await recordVoiceUsage({
      userId: ctx.userId!,
      sessionId: body.sessionId,
      responseId: body.responseId,
      maestroId: body.maestroId ?? null,
      model,
      usage: body.usage,
    });

    if (recorded) {
      log.debug('Voice usage recorded', { sessionId: body.sessionId, costEur: recorded.costEur });
    }

    return NextResponse.json(
      {
        success: true,
        costEur: recorded?.costEur ?? 0,
        idempotent: body.responseId !== undefined,
      },
      { headers },
    );
  } catch (error) {
    const conflict = error instanceof VoiceUsageConflictError;
    return NextResponse.json(
      { error: conflict ? 'response usage conflict' : 'voice usage storage unavailable' },
      { status: conflict ? 409 : 503, headers },
    );
  }
});
