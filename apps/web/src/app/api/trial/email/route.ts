import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { VISITOR_COOKIE_NAME, TRIAL_CONSENT_COOKIE } from '@/lib/auth/cookie-constants';
import { findOwnedTrialSession, hasTrialConsent } from '@/lib/trial/trial-request';
import { requestTrialEmailVerification, updateTrialEmail } from '@/lib/trial/trial-service';
import { logger } from '@/lib/logger';
import {
  checkRateLimitAsync,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';

export const revalidate = 0;
const log = logger.child({ module: 'api/trial/email' });

/**
 * PATCH /api/trial/email
 *
 * Save email to trial session for nurturing/conversion tracking.
 * Email capture is optional and can be triggered after X messages or at limit.
 */

export const PATCH = pipe(
  withSentry('/api/trial/email'),
  withCSRF,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimitResult = await checkRateLimitAsync(
    `trial:email:${clientId}`,
    RATE_LIMITS.CONTACT_FORM,
  );
  if (!rateLimitResult.success) {
    log.warn('Trial email rate limited', { clientId });
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await ctx.req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { sessionId, email } = body;

    // Validate input
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    // Basic email validation - simple pattern to avoid ReDoS
    // RFC 5322 compliant validation should happen server-side with proper library
    if (
      typeof email !== 'string' ||
      email.length > 254 ||
      !email.includes('@') ||
      email.indexOf('@') === 0 ||
      email.indexOf('@') === email.length - 1
    ) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const cookieStore = await cookies();
    if (!hasTrialConsent(cookieStore.get(TRIAL_CONSENT_COOKIE)?.value)) {
      return NextResponse.json({ error: 'Trial privacy consent required' }, { status: 403 });
    }
    const ownedSession = await findOwnedTrialSession(
      cookieStore.get(VISITOR_COOKIE_NAME)?.value,
      sessionId,
    );
    if (!ownedSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update only after independent visitor ownership has been established.
    const updatedSession = await updateTrialEmail(sessionId, email);

    // Request verification email
    const verificationResult = await requestTrialEmailVerification(sessionId);

    log.info('[TrialEmail] Email captured', {
      sessionId,
      hasEmail: !!updatedSession.email,
    });

    return NextResponse.json({
      success: true,
      email: updatedSession.email,
      emailCollectedAt: updatedSession.emailCollectedAt,
      emailVerifiedAt: verificationResult.session.emailVerifiedAt,
      verificationPending: true,
      expiresAt: verificationResult.expiresAt.toISOString(),
      emailSent: verificationResult.emailSent,
      ...(verificationResult.verificationCode && {
        verificationCode: verificationResult.verificationCode,
      }),
    });
  } catch (error) {
    // Handle session not found error
    if (error instanceof Error && error.message.includes('Session not found')) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes('Email not set')) {
      return NextResponse.json({ error: 'Email not set' }, { status: 400 });
    }

    log.error('[TrialEmail] Failed to save email', {
      error: String(error),
    });

    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
  }
});
