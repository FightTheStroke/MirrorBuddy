/**
 * API Route: Trial Voice Usage
 *
 * POST: Report voice session duration for trial users
 * GET: Check remaining voice time for trial users
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { checkTrialLimits, addVoiceSeconds, TRIAL_LIMITS } from '@/lib/trial/trial-service';
import { validateAuth } from '@/lib/auth/server';
import { VISITOR_COOKIE_NAME, TRIAL_CONSENT_COOKIE } from '@/lib/auth/cookie-constants';
import { findOwnedTrialSession, hasTrialConsent } from '@/lib/trial/trial-request';
import { isSessionBlocked } from '@/lib/trial/anti-abuse';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';
import { z } from 'zod';

export const revalidate = 0;
const log = logger.child({ module: 'api/trial/voice' });
const VoiceUsageSchema = z.object({ durationSeconds: z.number().finite().nonnegative() });

/**
 * POST /api/trial/voice
 *
 * Reports voice session duration for trial users.
 * Called when a voice session ends.
 */

export const POST = pipe(
  withSentry('/api/trial/voice'),
  withCSRF,
)(async (ctx) => {
  const auth = await validateAuth();
  try {
    // Check if authenticated user (skip trial tracking)
    if (auth.authenticated && auth.userId) {
      return NextResponse.json({ skipped: true, reason: 'authenticated' });
    }

    const parsed = VoiceUsageSchema.safeParse(await ctx.req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }
    const { durationSeconds } = parsed.data;

    // Get trial session
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
    if (!hasTrialConsent(cookieStore.get(TRIAL_CONSENT_COOKIE)?.value)) {
      return NextResponse.json({ error: 'Trial privacy consent required' }, { status: 403 });
    }

    if (!visitorId) {
      return NextResponse.json({ error: 'No trial session' }, { status: 400 });
    }

    const session = await findOwnedTrialSession(visitorId);
    if (!session) return NextResponse.json({ error: 'No trial session' }, { status: 404 });

    // F-03: Check if trial session is blocked due to abuse
    // Adapter for anti-abuse db interface
    const dbAdapter = {
      session: {
        findUnique: (args: unknown) =>
          prisma.trialSession.findUnique(
            args as Parameters<typeof prisma.trialSession.findUnique>[0],
          ),
      },
    };
    const blocked = await isSessionBlocked(session.id, dbAdapter);
    if (blocked) {
      log.warn('Trial voice session blocked for abuse', {
        sessionId: session.id.slice(0, 8),
      });
      return NextResponse.json(
        {
          error: 'Sessione bloccata per attività sospetta. Riprova tra 24 ore.',
          code: 'TRIAL_ABUSE_BLOCKED',
        },
        { status: 429 },
      );
    }

    // Add voice seconds
    const totalSeconds = await addVoiceSeconds(session.id, durationSeconds);
    const remainingSeconds = Math.max(0, TRIAL_LIMITS.VOICE_SECONDS - totalSeconds);

    log.info('Trial voice usage recorded', {
      sessionId: session.id.slice(0, 8),
      added: durationSeconds,
      total: totalSeconds,
      remaining: remainingSeconds,
    });

    // Funnel: LIMIT_HIT for voice (non-blocking)
    if (remainingSeconds === 0 && visitorId) {
      import('@/lib/funnel')
        .then(({ recordStageTransition }) => {
          recordStageTransition({ visitorId }, 'LIMIT_HIT', {
            limitType: 'trial_voice',
            source: 'voice_api',
          }).catch(() => {});
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      voiceSecondsUsed: totalSeconds,
      voiceSecondsRemaining: remainingSeconds,
      maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
      limitReached: remainingSeconds === 0,
    });
  } catch (error) {
    log.error('Failed to record voice usage', { error: String(error) });
    return NextResponse.json({ error: 'Failed to record voice usage' }, { status: 500 });
  }
});

/**
 * GET /api/trial/voice
 *
 * Check if voice is allowed for trial users and get remaining time.
 */
export const GET = pipe(withSentry('/api/trial/voice'))(async () => {
  const auth = await validateAuth();
  try {
    // Check if authenticated user (no trial limits)
    if (auth.authenticated && auth.userId) {
      return NextResponse.json({
        allowed: true,
        isTrialUser: false,
        voiceSecondsRemaining: -1, // Unlimited
      });
    }

    // Get trial session
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

    if (!visitorId || !hasTrialConsent(cookieStore.get(TRIAL_CONSENT_COOKIE)?.value)) {
      return NextResponse.json({
        allowed: false,
        isTrialUser: true,
        voiceSecondsRemaining: 0,
        maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
        reason: 'Trial privacy consent and activation required',
      });
    }

    const session = await findOwnedTrialSession(visitorId);
    if (!session) {
      return NextResponse.json({
        allowed: false,
        isTrialUser: true,
        voiceSecondsRemaining: 0,
        maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
        reason: 'Trial activation required',
      });
    }

    // Check limits
    const limitCheck = await checkTrialLimits(session.id, 'voice');
    const remainingSeconds = Math.max(0, TRIAL_LIMITS.VOICE_SECONDS - session.voiceSecondsUsed);

    return NextResponse.json({
      allowed: limitCheck.allowed,
      isTrialUser: true,
      voiceSecondsUsed: session.voiceSecondsUsed,
      voiceSecondsRemaining: remainingSeconds,
      maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
      reason: limitCheck.reason,
    });
  } catch (error) {
    log.error('Failed to check voice limit', { error: String(error) });
    return NextResponse.json({ error: 'Failed to check voice limit' }, { status: 500 });
  }
});
