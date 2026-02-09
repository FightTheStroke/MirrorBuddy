/**
 * Admin Safety - Block User API
 * F-15 - Human oversight intervention for high-risk AI systems
 * Compliance: AI Act Art.14 (human oversight)
 *
 * Blocks a user when repeated safety violations are detected.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { logAdminAction } from "@/lib/admin/audit-service";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "safety-intervention" });

export const POST = pipe(
  withSentry("/api/admin/safety/block-user"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = (await ctx.req.json()) as {
    userId: string;
    reason?: string;
  };

  const { userId, reason } = body;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Block the user by setting disabled = true
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { disabled: true },
  });

  // Log the admin action
  await logAdminAction({
    action: "BLOCK_USER",
    entityType: "User",
    entityId: userId,
    adminId: ctx.userId!,
    details: {
      reason: reason || "Safety intervention",
      previousState: user.disabled,
    },
  });

  log.info("User blocked via safety intervention", {
    userId,
    adminId: ctx.userId,
    reason,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      username: updated.username,
      disabled: updated.disabled,
    },
  });
});
