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
import {
  AUTH_COOKIE_NAME,
  VISITOR_COOKIE_NAME,
} from "@/lib/auth/cookie-constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const route = body.route || "/";

    // Get user identification from cookies for classification (not authentication)
    // This endpoint accepts all users (logged, trial, anonymous) and classifies them
    const cookieStore = await cookies();
    // eslint-disable-next-line local-rules/prefer-validate-auth -- Classification only, not authentication. Accepts all user types.
    const userCookie = cookieStore.get(AUTH_COOKIE_NAME);
    const visitorCookie = cookieStore.get(VISITOR_COOKIE_NAME);

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
