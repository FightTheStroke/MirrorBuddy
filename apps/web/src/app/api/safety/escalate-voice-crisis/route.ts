/**
 * API Route: Voice Crisis Escalation
 *
 * POST /api/safety/escalate-voice-crisis
 *
 * T1.1: the voice session's client-side safety intervention
 * (`safety-intervention.ts`) redirects the conversation and logs a local
 * VCE-004 audit entry when it flags a crisis, but — unlike the non-streaming
 * chat path — never escalated server-side: no compliance record, no
 * parent/guardian notification. This route gives the voice path parity with
 * `POST /api/chat`'s crisis handling (escalateCrisisDetected +
 * notifyParentOfCrisis), reusing the exact same escalation service.
 *
 * Anonymous (Trial) voice sessions are supported — escalation still records
 * with userId=null; only the parent-notification step is skipped (it needs
 * a Settings/CoppaConsent row tied to a real account).
 */

import { NextResponse, after } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';
import { validateAuth } from '@/lib/auth/server';
import { detectLocaleFromNextRequest } from '@/lib/i18n/locale-detection';
import {
  logSafetyEvent,
  recordComplianceCrisisDetected,
  escalateCrisisDetected,
  notifyParentOfCrisis,
} from '@/lib/safety/server';

export const revalidate = 0;

interface VoiceCrisisEscalationBody {
  sessionId: string;
  maestroId?: string;
  contentSnippet?: string;
}

export const POST = pipe(withSentry('/api/safety/escalate-voice-crisis'))(async (ctx) => {
  const auth = await validateAuth();
  const userId = auth.authenticated && auth.userId ? auth.userId : undefined;

  const body = (await ctx.req.json().catch(() => null)) as VoiceCrisisEscalationBody | null;
  if (!body?.sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  const { sessionId, maestroId } = body;
  // GDPR Art. 25 (data minimization): never persist the raw transcript, only
  // a short snippet for compliance audit context — same bound as the chat path.
  const contentSnippet = body.contentSnippet?.slice(0, 50);

  const runCrisisSideEffects = () =>
    Promise.all([
      logSafetyEvent('crisis_detected', 'critical', {
        userId,
        sessionId,
        category: 'crisis',
        contentSnippet,
      }),
      recordComplianceCrisisDetected('crisis_detected', {
        sessionId,
        maestroId,
      }),
      escalateCrisisDetected(userId || 'anonymous', sessionId, {
        contentSnippet,
        maestroId,
      }),
      userId
        ? notifyParentOfCrisis({
            userId,
            category: 'crisis',
            severity: 'critical',
            maestroId,
            timestamp: new Date(),
            locale: detectLocaleFromNextRequest(ctx.req),
          })
        : Promise.resolve(),
    ]);

  try {
    after(() =>
      runCrisisSideEffects().catch(() => {
        // Crisis logging must never crash the caller.
      }),
    );
  } catch {
    // after() throws outside a request-scoped execution context (e.g. tests).
    void runCrisisSideEffects().catch(() => {});
  }

  return NextResponse.json({ success: true });
});
