import { NextRequest, NextResponse } from "next/server";
import { updateTrialEmail } from "@/lib/trial/trial-service";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/trial/email" });

/**
 * PATCH /api/trial/email
 *
 * Save email to trial session for nurturing/conversion tracking.
 * Email capture is optional and can be triggered after X messages or at limit.
 */
export async function PATCH(request: NextRequest) {
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

    log.info("[TrialEmail] Email captured", {
      sessionId,
      hasEmail: !!updatedSession.email,
    });

    return NextResponse.json({
      success: true,
      email: updatedSession.email,
      emailCollectedAt: updatedSession.emailCollectedAt,
    });
  } catch (error) {
    // Handle session not found error
    if (error instanceof Error && error.message.includes("Session not found")) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
