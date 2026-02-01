import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { createDeletedUserBackup } from "@/lib/admin/user-trash-service";
import { executeUserDataDeletion } from "@/app/api/privacy/delete-my-data/helpers";

export const PATCH = pipe(
  withSentry("/api/admin/users/[id]"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const params = await ctx.params;
  const targetId = params.id;
  if (!targetId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const { disabled } = (await ctx.req.json()) as { disabled?: boolean };
  if (disabled === undefined) {
    return NextResponse.json(
      { error: "disabled field is required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    logger.warn("User not found", { userId: targetId, adminId: ctx.userId });
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { disabled },
  });

  // Create audit log for status change
  await prisma.tierAuditLog.create({
    data: {
      userId: targetId,
      adminId: ctx.userId!,
      action: "USER_STATUS_CHANGE",
      changes: {
        old: { disabled: user.disabled },
        new: { disabled },
      },
    },
  });

  logger.info("User status updated", {
    userId: targetId,
    adminId: ctx.userId,
    disabled,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      disabled: updated.disabled,
      role: updated.role,
    },
  });
});

export const DELETE = pipe(
  withSentry("/api/admin/users/[id]"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const params = await ctx.params;
  const targetId = params.id;
  if (!targetId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const body = (await ctx.req.json().catch(() => ({}))) as {
    reason?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    logger.warn("User not found", { userId: targetId, adminId: ctx.userId });
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await createDeletedUserBackup(targetId, ctx.userId!, body.reason);
  await executeUserDataDeletion(targetId);

  logger.info("Admin deleted user with backup", {
    userId: targetId,
    adminId: ctx.userId,
  });

  return NextResponse.json({ success: true });
});
