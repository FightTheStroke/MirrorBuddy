import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getOrCreateTrialSession } from "@/lib/trial/trial-service";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/trial/session" });

/**
 * POST /api/trial/session
 *
 * Creates or retrieves a trial session for the current visitor.
 * Uses IP hash + visitor cookie for session tracking (ADR 0056).
 */
export async function POST(_request: NextRequest) {
  try {
    // Get IP from headers
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

    // Get or create visitor ID from cookie
    const cookieStore = await cookies();
    let visitorId = cookieStore.get("mirrorbuddy-visitor-id")?.value;

    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    // Create or retrieve trial session
    const session = await getOrCreateTrialSession(ip, visitorId);

    log.info("[TrialSession] Session created/retrieved", {
      sessionId: session.id,
      isNew: session.chatsUsed === 0,
    });

    // Set visitor cookie if not present
    const response = NextResponse.json({
      sessionId: session.id,
      chatsUsed: session.chatsUsed,
      docsUsed: session.docsUsed,
      assignedMaestri: JSON.parse(session.assignedMaestri),
      assignedCoach: session.assignedCoach,
    });

    if (!cookieStore.get("mirrorbuddy-visitor-id")) {
      response.cookies.set("mirrorbuddy-visitor-id", visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }

    return response;
  } catch (error) {
    log.error("[TrialSession] Failed to create session", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to create trial session" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/trial/session
 *
 * Retrieves the current trial session status.
 */
export async function GET() {
  try {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0].trim() || realIp || "unknown";

    const cookieStore = await cookies();
    const visitorId = cookieStore.get("mirrorbuddy-visitor-id")?.value;

    if (!visitorId) {
      return NextResponse.json({ hasSession: false });
    }

    const session = await getOrCreateTrialSession(ip, visitorId);

    return NextResponse.json({
      hasSession: true,
      sessionId: session.id,
      chatsUsed: session.chatsUsed,
      docsUsed: session.docsUsed,
      chatsRemaining: Math.max(0, 10 - session.chatsUsed),
      docsRemaining: Math.max(0, 1 - session.docsUsed),
      assignedMaestri: JSON.parse(session.assignedMaestri),
      assignedCoach: session.assignedCoach,
    });
  } catch (error) {
    log.error("[TrialSession] Failed to get session", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to get trial session" },
      { status: 500 },
    );
  }
}
