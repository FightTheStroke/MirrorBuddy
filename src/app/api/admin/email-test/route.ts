/**
 * POST /api/admin/email-test
 *
 * Admin endpoint to send a test email for verifying email configuration.
 * Requires admin authentication and CSRF protection.
 *
 * Reference: ADR 0113 (Email Communications System)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { sendTestEmail, isEmailConfigured } from "@/lib/email";
import { logAdminAction, getClientIp } from "@/lib/admin/audit-service";

/**
 * Email validation regex
 * Simple validation - full validation happens at email service level
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email address format
 */
function isValidEmail(email: string): boolean {
  return typeof email === "string" && EMAIL_REGEX.test(email);
}

export const POST = pipe(
  withSentry("/api/admin/email-test"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  // Parse request body
  let body: { to?: string };
  try {
    body = await ctx.req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const { to } = body;

  // Validate 'to' field
  if (!to) {
    return NextResponse.json(
      { error: "Missing required field: 'to'" },
      { status: 400 },
    );
  }

  if (!isValidEmail(to)) {
    return NextResponse.json(
      { error: "Invalid email address format - must be a valid email" },
      { status: 400 },
    );
  }

  // Check if email service is configured
  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Email service not configured - RESEND_API_KEY environment variable missing",
      },
      { status: 503 },
    );
  }

  // Send test email
  const result = await sendTestEmail(to);

  // Log admin action on success
  if (result.success && ctx.userId) {
    await logAdminAction({
      action: "SEND_TEST_EMAIL",
      entityType: "EmailTest",
      entityId: to,
      adminId: ctx.userId,
      details: { messageId: result.messageId },
      ipAddress: getClientIp(ctx.req),
    });
  }

  // Return result
  return NextResponse.json({
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  });
});
