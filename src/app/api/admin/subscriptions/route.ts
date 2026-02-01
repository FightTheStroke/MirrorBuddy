import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/**
 * GET /api/admin/subscriptions
 * List all subscriptions with optional filters
 * Query params: userId, tierId, status
 */
export const GET = pipe(
  withSentry("/api/admin/subscriptions"),
  withAdmin,
)(async (ctx) => {
  const searchParams = ctx.req.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const tierId = searchParams.get("tierId");
  const status = searchParams.get("status");

  // Build filter object
  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (tierId) where.tierId = tierId;
  if (status) where.status = status;

  const subscriptions = await prisma.userSubscription.findMany({
    where,
    include: {
      tier: true,
    },
  });

  return NextResponse.json(subscriptions);
});
