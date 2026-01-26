import { NextRequest, NextResponse } from "next/server";
import {
  requestTrialEmailVerification,
  updateTrialEmail,
} from "@/lib/trial/trial-service";
import { logger } from "@/lib/logger";
import {
  checkRateLimitAsync,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const log = logger.child({ module: "api/trial/email" });

/**
 * PATCH /api/trial/email
 *
 * Save email to trial session for nurturing/conversion tracking.
 * Email capture is optional and can be triggered after X messages or at limit.
 */
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimitResult = await checkRateLimitAsync(
    `trial:email:${clientId}`,
    RATE_LIMITS.CONTACT_FORM,
  );
  if (!rateLimitResult.success) {
    log.warn("Trial email rate limited", { clientId });
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const { sessionId, email } = body;

    // Validate input
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    // Basic email validation - simple pattern to avoid ReDoS
    // RFC 5322 compliant validation should happen server-side with proper library
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !email.includes("@") ||
      email.indexOf("@") === 0 ||
      email.indexOf("@") === email.length - 1
    ) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Update session with email
    const updatedSession = await updateTrialEmail(sessionId, email);

    // Request verification email
    const verificationResult = await requestTrialEmailVerification(sessionId);

    log.info("[TrialEmail] Email captured", {
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
    if (error instanceof Error && error.message.includes("Session not found")) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Email not set")) {
      return NextResponse.json({ error: "Email not set" }, { status: 400 });
    }

    log.error("[TrialEmail] Failed to save email", {
      error: String(error),
    });

    return NextResponse.json(
      { error: "Failed to save email" },
      { status: 500 },
    );
  }
}
