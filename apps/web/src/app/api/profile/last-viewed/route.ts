/**
 * API Route: Parent Dashboard Last Viewed Timestamp
 * GET: Get when parent dashboard was last viewed
 * POST: Update the last viewed timestamp
 */

import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";

/**
 * GET /api/profile/last-viewed
 * Returns the timestamp when parent dashboard was last viewed
 */

export const revalidate = 0;
export const GET = pipe(withSentry("/api/profile/last-viewed"))(async () => {
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
});

/**
 * POST /api/profile/last-viewed
 * Updates the last viewed timestamp
 */
export const POST = pipe(
  withSentry("/api/profile/last-viewed"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();
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
});
