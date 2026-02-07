import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { pipe, withSentry, withRateLimit } from "@/lib/api/middlewares";
import { RATE_LIMITS } from "@/lib/rate-limit";

const log = logger.child({ module: "auth/reset-password" });

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- public reset-password endpoint, uses rate limiting
export const POST = pipe(
  withSentry("/api/auth/reset-password"),
  withRateLimit(RATE_LIMITS.AUTH_LOGIN),
)(async (ctx) => {
  const body = await ctx.req.json();
  const { token, password } = body;

  // Validate required fields
  if (
    !token ||
    typeof token !== "string" ||
    !password ||
    typeof password !== "string"
  ) {
    log.warn("Reset password: missing token or password");
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 },
    );
  }

  // Validate password strength
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    log.warn("Reset password: weak password", { errors: validation.errors });
    return NextResponse.json(
      { error: "Password not strong enough", details: validation.errors },
      { status: 400 },
    );
  }

  try {
    // Find reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    // Check if token exists
    if (!resetToken) {
      log.warn("Reset password: token not found", { token });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      log.warn("Reset password: token expired", {
        token,
        expiresAt: resetToken.expiresAt,
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Check if token was already used
    if (resetToken.used) {
      log.warn("Reset password: token already used", { token });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update user's password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    log.info("Reset password: password updated successfully", {
      userId: resetToken.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Password reset successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    log.error("Reset password: unexpected error", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 },
    );
  }
});
