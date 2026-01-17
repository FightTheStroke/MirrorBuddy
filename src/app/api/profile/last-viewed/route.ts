/**
 * API Route: Parent Dashboard Last Viewed Timestamp
 * GET: Get when parent dashboard was last viewed
 * POST: Update the last viewed timestamp
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireCSRF } from "@/lib/security/csrf";

/**
 * GET /api/profile/last-viewed
 * Returns the timestamp when parent dashboard was last viewed
 */
export async function GET() {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ lastViewed: null });
    }
    const userId = auth.userId!;

    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { parentDashboardLastViewed: true },
    });

    return NextResponse.json({
      lastViewed: settings?.parentDashboardLastViewed?.toISOString() || null,
    });
  } catch (error) {
    logger.error("Failed to get last viewed timestamp", {
      error: String(error),
    });
    return NextResponse.json({ lastViewed: null });
  }
}

/**
 * POST /api/profile/last-viewed
 * Updates the last viewed timestamp
 */
export async function POST(request: NextRequest) {
  // Validate CSRF token
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    // Upsert settings with the new timestamp
    await prisma.settings.upsert({
      where: { userId },
      update: { parentDashboardLastViewed: timestamp },
      create: {
        userId,
        parentDashboardLastViewed: timestamp,
      },
    });

    return NextResponse.json({
      success: true,
      lastViewed: timestamp.toISOString(),
    });
  } catch (error) {
    logger.error("Failed to update last viewed timestamp", {
      error: String(error),
    });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
