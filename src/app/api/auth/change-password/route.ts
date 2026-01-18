/**
 * Change Password API Route
 * Allows authenticated users to change their password
 * Required for first-time login after admin-generated credentials (ADR 0057)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/auth/password";
import { verifyCookieValue } from "@/lib/auth/cookie-signing";
import { requireCSRF } from "@/lib/security/csrf";

const log = logger.child({ module: "auth/change-password" });

export async function POST(request: NextRequest) {
  // CSRF validation
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    // Get user ID from signed cookie
    const cookieStore = await cookies();
    const signedCookie = cookieStore.get("mirrorbuddy-user-id")?.value;

    if (!signedCookie) {
      log.warn("Change password attempt: no session cookie");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const verification = verifyCookieValue(signedCookie);
    if (!verification.valid || !verification.value) {
      log.warn("Change password attempt: invalid session cookie");
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = verification.value;

    // Parse request body
    const { currentPassword, newPassword } = await request.json();

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
      where: { id: userId },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        disabled: true,
      },
    });

    if (!user) {
      log.warn("Change password attempt: user not found", { userId });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.disabled) {
      log.warn("Change password attempt: user disabled", { userId });
      return NextResponse.json(
        { error: "Account is disabled" },
        { status: 403 },
      );
    }

    // Verify current password
    if (
      !user.passwordHash ||
      !(await verifyPassword(currentPassword, user.passwordHash))
    ) {
      log.warn("Change password attempt: invalid current password", { userId });
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    // Hash new password and update
    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false, // Clear the flag
      },
    });

    log.info("Password changed successfully", { userId });

    return NextResponse.json(
      { success: true, message: "Password changed successfully" },
      { status: 200 },
    );
  } catch (error) {
    log.error("Change password error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 },
    );
  }
}
