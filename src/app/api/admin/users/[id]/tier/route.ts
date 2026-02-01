import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/users/[id]/tier
 * Change a user's tier subscription
 */
export const POST = pipe(
  withSentry("/api/admin/users/[id]/tier"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();
  const { tierId, notes } = body;

  // Validate required fields
  if (!tierId) {
    return NextResponse.json({ error: "tierId is required" }, { status: 400 });
  }

  const { id: userId } = await ctx.params;

  // Check if user exists and get current subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: {
          tier: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if tier exists
  const newTier = await prisma.tierDefinition.findUnique({
    where: { id: tierId },
  });

  if (!newTier) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }

  // Upsert user subscription
  const subscription = await prisma.userSubscription.upsert({
    where: { userId },
    create: {
      userId,
      tierId,
      status: "ACTIVE",
    },
    update: {
      tierId,
      status: "ACTIVE",
    },
  });

  // Create audit log entry
  const auditLog = await prisma.tierAuditLog.create({
    data: {
      userId,
      adminId: ctx.userId || "unknown",
      action: "TIER_CHANGE",
      changes: {
        from: user.subscription
          ? {
              tierId: user.subscription.tierId,
              tierCode: user.subscription.tier?.code,
              tierName: user.subscription.tier?.name,
            }
          : null,
        to: {
          tierId: newTier.id,
          tierCode: newTier.code,
          tierName: newTier.name,
        },
      },
      notes: notes || null,
    },
  });

  return NextResponse.json({
    success: true,
    subscription,
    auditLogId: auditLog.id,
  });
});
