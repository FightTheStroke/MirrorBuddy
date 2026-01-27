/**
 * API Route: Trial Voice Usage
 *
 * POST: Report voice session duration for trial users
 * GET: Check remaining voice time for trial users
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { logger } from "@/lib/logger";
import { requireCSRF } from "@/lib/security/csrf";
import {
  getOrCreateTrialSession,
  checkTrialLimits,
  addVoiceSeconds,
  TRIAL_LIMITS,
} from "@/lib/trial/trial-service";
import { validateAuth } from "@/lib/auth/session-auth";
import { VISITOR_COOKIE_NAME } from "@/lib/auth/cookie-constants";
import { isSessionBlocked } from "@/lib/trial/anti-abuse";
import { prisma } from "@/lib/db";

const log = logger.child({ module: "api/trial/voice" });

/**
 * POST /api/trial/voice
 *
 * Reports voice session duration for trial users.
 * Called when a voice session ends.
 */
export async function POST(request: NextRequest) {
  // CSRF validation
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    // Check if authenticated user (skip trial tracking)
    const auth = await validateAuth();
    if (auth.authenticated && auth.userId) {
      return NextResponse.json({ skipped: true, reason: "authenticated" });
    }

    // Get trial session
    const cookieStore = await cookies();
    // eslint-disable-next-line no-restricted-syntax -- visitor cookie, not auth
    const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

    if (!visitorId) {
      return NextResponse.json({ error: "No trial session" }, { status: 400 });
    }

    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

    const session = await getOrCreateTrialSession(
      ip,
      visitorId,
      auth.userId || undefined,
    );

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
      log.warn("Trial voice session blocked for abuse", {
        sessionId: session.id.slice(0, 8),
      });
      return NextResponse.json(
        {
          error: "Sessione bloccata per attività sospetta. Riprova tra 24 ore.",
          code: "TRIAL_ABUSE_BLOCKED",
        },
        { status: 429 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { durationSeconds } = body;

    if (typeof durationSeconds !== "number" || durationSeconds < 0) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // Add voice seconds
    const totalSeconds = await addVoiceSeconds(session.id, durationSeconds);
    const remainingSeconds = Math.max(
      0,
      TRIAL_LIMITS.VOICE_SECONDS - totalSeconds,
    );

    log.info("Trial voice usage recorded", {
      sessionId: session.id.slice(0, 8),
      added: durationSeconds,
      total: totalSeconds,
      remaining: remainingSeconds,
    });

    return NextResponse.json({
      success: true,
      voiceSecondsUsed: totalSeconds,
      voiceSecondsRemaining: remainingSeconds,
      maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
      limitReached: remainingSeconds === 0,
    });
  } catch (error) {
    log.error("Failed to record voice usage", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to record voice usage" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/trial/voice
 *
 * Check if voice is allowed for trial users and get remaining time.
 */
export async function GET() {
  try {
    // Check if authenticated user (no trial limits)
    const auth = await validateAuth();
    if (auth.authenticated && auth.userId) {
      return NextResponse.json({
        allowed: true,
        isTrialUser: false,
        voiceSecondsRemaining: -1, // Unlimited
      });
    }

    // Get trial session
    const cookieStore = await cookies();
    // eslint-disable-next-line no-restricted-syntax -- visitor cookie, not auth
    const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

    if (!visitorId) {
      // No session yet - allow with full quota
      return NextResponse.json({
        allowed: true,
        isTrialUser: true,
        voiceSecondsRemaining: TRIAL_LIMITS.VOICE_SECONDS,
        maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
      });
    }

    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

    const session = await getOrCreateTrialSession(
      ip,
      visitorId,
      auth.userId || undefined,
    );

    // Check limits
    const limitCheck = await checkTrialLimits(session.id, "voice");
    const remainingSeconds = Math.max(
      0,
      TRIAL_LIMITS.VOICE_SECONDS - session.voiceSecondsUsed,
    );

    return NextResponse.json({
      allowed: limitCheck.allowed,
      isTrialUser: true,
      voiceSecondsUsed: session.voiceSecondsUsed,
      voiceSecondsRemaining: remainingSeconds,
      maxVoiceSeconds: TRIAL_LIMITS.VOICE_SECONDS,
      reason: limitCheck.reason,
    });
  } catch (error) {
    log.error("Failed to check voice limit", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to check voice limit" },
      { status: 500 },
    );
  }
}
