/**
 * Change Password API Route
 * Allows authenticated users to change their password
 * Required for first-time login after admin-generated credentials (ADR 0057)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/auth/server";
import { RATE_LIMITS } from "@/lib/rate-limit";
import {
  pipe,
  withSentry,
  withCSRF,
  withRateLimit,
  withAuth,
} from "@/lib/api/middlewares";

const log = logger.child({ module: "auth/change-password" });

export const POST = pipe(
  withSentry("/api/auth/change-password"),
  withCSRF,
  withRateLimit(RATE_LIMITS.AUTH_PASSWORD),
  withAuth,
)(async (ctx) => {
  // Parse request body
  const { currentPassword, newPassword } = await ctx.req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required" },
      { status: 400 },
    );
  }

  // Validate new password strength
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Password not strong enough", details: validation.errors },
      { status: 400 },
    );
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      disabled: true,
    },
  });

  if (!user) {
    log.warn("Change password attempt: user not found", { userId: ctx.userId });
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.disabled) {
    log.warn("Change password attempt: user disabled", { userId: ctx.userId });
    return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
  }

  // Verify current password
  if (
    !user.passwordHash ||
    !(await verifyPassword(currentPassword, user.passwordHash))
  ) {
    log.warn("Change password attempt: invalid current password", {
      userId: ctx.userId,
    });
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }

  // Hash new password and update
  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: ctx.userId },
    data: {
      passwordHash: newHash,
      mustChangePassword: false, // Clear the flag
    },
  });

  log.info("Password changed successfully", { userId: ctx.userId });

  return NextResponse.json(
    { success: true, message: "Password changed successfully" },
    { status: 200 },
  );
});
