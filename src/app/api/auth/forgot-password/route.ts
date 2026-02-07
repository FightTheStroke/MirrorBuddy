import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { getPasswordResetEmail } from "@/lib/email/templates/password-reset-template";
import { pipe, withSentry, withRateLimit } from "@/lib/api/middlewares";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { hashPII } from "@/lib/security/pii-encryption";
import crypto from "crypto";

const log = logger.child({ module: "auth/forgot-password" });

// Rate limit: 3 requests per email per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Email validation regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate secure random token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- public forgot-password endpoint, uses rate limiting
export const POST = pipe(
  withSentry("/api/auth/forgot-password"),
  withRateLimit(RATE_LIMITS.AUTH_LOGIN),
)(async (ctx) => {
  const body = await ctx.req.json();
  const { email } = body;

  // Validate email presence
  if (!email || typeof email !== "string") {
    log.warn("Forgot password: missing email");
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    log.warn("Forgot password: invalid email format", { email });
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const securityMessage =
    "If an account exists with this email, you will receive a password reset link";

  try {
    // Find user by emailHash (PII-encrypted lookup)
    const emailHash = await hashPII(normalizedEmail);
    const user = await prisma.user.findFirst({
      where: { emailHash },
      select: {
        id: true,
        emailHash: true,
        settings: { select: { language: true } },
      },
    });

    // If user doesn't exist, return success for security (no user enumeration)
    if (!user) {
      log.info("Forgot password: user not found (security response)", {
        email: normalizedEmail,
      });
      return NextResponse.json({ message: securityMessage }, { status: 200 });
    }

    // Check rate limit for this user (max 3 reset requests per hour)
    const recentTokens = await prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS),
        },
      },
    });

    if (recentTokens >= RATE_LIMIT_MAX) {
      log.warn("Forgot password: rate limit exceeded", { userId: user.id });
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again later." },
        { status: 429 },
      );
    }

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // Create reset token in database
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
      },
    });

    // Get user's locale (default to 'en')
    const locale = user.settings?.language || "en";

    // Generate reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/${locale}/reset-password?token=${token}`;

    // Generate email content
    const { subject, html } = getPasswordResetEmail(resetUrl, locale);

    // Send email (use normalized input email since DB email is encrypted)
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject,
      html,
    });

    if (!emailResult.success) {
      log.error("Forgot password: email send failed", {
        userId: user.id,
        error: emailResult.error,
      });
      // Still return success for security (don't reveal email failure)
      return NextResponse.json({ message: securityMessage }, { status: 200 });
    }

    log.info("Forgot password: reset email sent", {
      userId: user.id,
      messageId: emailResult.messageId,
    });

    return NextResponse.json({ message: securityMessage }, { status: 200 });
  } catch (error) {
    log.error("Forgot password: unexpected error", {
      error: String(error),
      email: normalizedEmail,
    });
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 },
    );
  }
});
