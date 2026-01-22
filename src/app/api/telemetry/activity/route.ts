/**
 * Real-time User Activity Tracking Endpoint
 *
 * Records user activity to the database for serverless-safe metrics.
 * Called by client-side tracking hook on page navigation.
 *
 * POST /api/telemetry/activity
 * Body: { route: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const route = body.route || "/";

    // Get user identification from cookies
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("mirrorbuddy-user-id");
    const visitorCookie = cookieStore.get("mirrorbuddy-visitor-id");

    // Determine user type and identifier
    const isAuthenticated = !!userCookie?.value;
    const hasTrialSession = !!visitorCookie?.value;

    const userType = isAuthenticated
      ? "logged"
      : hasTrialSession
        ? "trial"
        : "anonymous";

    const identifier =
      userCookie?.value ||
      visitorCookie?.value ||
      request.headers.get("x-request-id") ||
      "unknown";

    // F-06: Detect test sessions (ADR 0065)
    // E2E tests use identifiers starting with "e2e-test-"
    const isTestData = identifier.startsWith("e2e-test-");

    // Record activity in database
    await prisma.userActivity.create({
      data: {
        identifier,
        userType,
        route,
        isTestData,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // Silent failure - don't break the user experience for telemetry
    logger.error("[activity] Failed to record", { error: String(error) });
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
