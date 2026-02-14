import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { pipe, withSentry } from '@/lib/api/middlewares';
import {
  getOrCreateTrialSession,
  isTrialVerificationPending,
  TRIAL_LIMITS,
} from '@/lib/trial/trial-service';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/server';
import { VISITOR_COOKIE_NAME, TRIAL_CONSENT_COOKIE } from '@/lib/auth/server';
import { checkAbuse, incrementAbuseScore } from '@/lib/trial/anti-abuse';
import { prisma } from '@/lib/db';


export const revalidate = 0;
const log = logger.child({ module: 'api/trial/session' });

/**
 * POST /api/trial/session
 *
 * Creates or retrieves a trial session for the current visitor.
 * Uses IP hash + visitor cookie for session tracking (ADR 0056).
 * Requires explicit consent to privacy policy (F-02: GDPR compliance).
 */
// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- trial endpoint, visitor cookie only, no session auth to protect
export const POST = pipe(withSentry('/api/trial/session'))(async (ctx) => {
  // F-02: Check GDPR consent before creating trial session
  const cookieStore = await cookies();
  const trialConsentCookie = cookieStore.get(TRIAL_CONSENT_COOKIE);

  // Validate that consent was explicitly given
  if (!trialConsentCookie?.value) {
    log.warn('[TrialSession] Consent check failed - no consent cookie', {
      path: ctx.req.nextUrl.pathname,
    });
    return NextResponse.json(
      {
        error:
          "Consenso privacy richiesto prima di iniziare la prova. Accetta l'informativa privacy sulla pagina di benvenuto.",
      },
      { status: 403 },
    );
  }

  // Validate consent data format
  try {
    const consentData = JSON.parse(decodeURIComponent(trialConsentCookie.value));
    if (!consentData.accepted) {
      return NextResponse.json(
        {
          error: 'Consenso privacy non valido',
        },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      {
        error: 'Consenso privacy non valido',
      },
      { status: 403 },
    );
  }

  // Check if user is authenticated
  const auth = await validateAuth();

  // Get IP from headers
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';

  // Get or create visitor ID from cookie
  let visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

  if (!visitorId) {
    visitorId = crypto.randomUUID();
  }

  // Create or retrieve trial session
  const session = await getOrCreateTrialSession(ip, visitorId, auth.userId || undefined);

  // F-03: Anti-abuse detection on session creation
  const abuseCheck = checkAbuse(ip, visitorId);
  if (abuseCheck.isAbuse) {
    // Adapter for anti-abuse db interface
    const dbAdapter = {
      session: {
        update: (args: unknown) =>
          prisma.trialSession.update(args as Parameters<typeof prisma.trialSession.update>[0]),
      },
    };
    await incrementAbuseScore(session.id, abuseCheck.score, dbAdapter);
    log.warn('[TrialSession] Abuse detected', {
      sessionId: session.id.slice(0, 8),
      score: abuseCheck.score,
      reason: abuseCheck.reason,
    });
  }

  log.info('[TrialSession] Session created/retrieved', {
    sessionId: session.id,
    isNew: session.chatsUsed === 0,
    abuseScore: abuseCheck.score,
  });

  // Set visitor cookie if not present
  const response = NextResponse.json({
    sessionId: session.id,
    // Chat limits
    chatsUsed: session.chatsUsed,
    chatsRemaining: Math.max(0, TRIAL_LIMITS.CHAT - session.chatsUsed),
    maxChats: TRIAL_LIMITS.CHAT,
    // Voice limits
    voiceSecondsUsed: session.voiceSecondsUsed,
    voiceSecondsRemaining: Math.max(0, TRIAL_LIMITS.VOICE_SECONDS - session.voiceSecondsUsed),
    maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
    // Tool limits
    toolsUsed: session.toolsUsed,
    toolsRemaining: Math.max(0, TRIAL_LIMITS.TOOLS - session.toolsUsed),
    maxTools: TRIAL_LIMITS.TOOLS,
    // Doc limits
    docsUsed: session.docsUsed,
    docsRemaining: Math.max(0, TRIAL_LIMITS.DOCS - session.docsUsed),
    maxDocs: TRIAL_LIMITS.DOCS,
    // Assigned characters
    assignedMaestri: JSON.parse(session.assignedMaestri),
    assignedCoach: session.assignedCoach,
    // Email verification
    email: session.email,
    emailCollectedAt: session.emailCollectedAt,
    emailVerifiedAt: session.emailVerifiedAt,
    verificationPending: isTrialVerificationPending(session),
  });

  if (!cookieStore.get(VISITOR_COOKIE_NAME)) {
    response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }

  return response;
});

/**
 * GET /api/trial/session
 *
 * Retrieves the current trial session status.
 */
export const GET = pipe(withSentry('/api/trial/session'))(async () => {
  // Check if user is authenticated
  const auth = await validateAuth();

  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';

  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

  if (!visitorId) {
    return NextResponse.json({ hasSession: false });
  }

  const session = await getOrCreateTrialSession(ip, visitorId, auth.userId || undefined);

  return NextResponse.json({
    hasSession: true,
    sessionId: session.id,
    // Chat limits
    chatsUsed: session.chatsUsed,
    chatsRemaining: Math.max(0, TRIAL_LIMITS.CHAT - session.chatsUsed),
    maxChats: TRIAL_LIMITS.CHAT,
    // Voice limits
    voiceSecondsUsed: session.voiceSecondsUsed,
    voiceSecondsRemaining: Math.max(0, TRIAL_LIMITS.VOICE_SECONDS - session.voiceSecondsUsed),
    maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
    // Tool limits
    toolsUsed: session.toolsUsed,
    toolsRemaining: Math.max(0, TRIAL_LIMITS.TOOLS - session.toolsUsed),
    maxTools: TRIAL_LIMITS.TOOLS,
    // Doc limits
    docsUsed: session.docsUsed,
    docsRemaining: Math.max(0, TRIAL_LIMITS.DOCS - session.docsUsed),
    maxDocs: TRIAL_LIMITS.DOCS,
    // Assigned characters
    assignedMaestri: JSON.parse(session.assignedMaestri),
    assignedCoach: session.assignedCoach,
    // Email verification
    email: session.email,
    emailCollectedAt: session.emailCollectedAt,
    emailVerifiedAt: session.emailVerifiedAt,
    verificationPending: isTrialVerificationPending(session),
  });
});
