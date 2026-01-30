// ============================================================================
// SESSION API - CSRF TOKEN ISSUANCE
// Provides CSRF token generation for protecting against Cross-Site Request Forgery attacks
// Implements double-submit cookie pattern per OWASP recommendations
// ============================================================================

import { NextResponse } from "next/server";
import { generateCSRFToken, CSRF_TOKEN_COOKIE } from "@/lib/security/csrf";
import * as Sentry from "@sentry/nextjs";

interface SessionResponse {
  csrfToken: string;
}

/**
 * GET /api/session
 * Generates and returns a new CSRF token for the client
 * Sets a secure, HTTP-only cookie for double-submit pattern validation
 *
 * Security measures:
 * - Token: 32-byte cryptographically random value (base64url encoded)
 * - Cookie: httpOnly (prevents JS access), sameSite (prevents cross-site requests)
 * - Secure flag enabled in production (HTTPS only)
 * - 30-minute expiry aligns with typical session duration
 *
 * Response: { csrfToken: string }
 */
export async function GET() {
  try {
    // Generate new CSRF token
    const csrfToken = generateCSRFToken();

    // Create response with token
    const response = NextResponse.json<SessionResponse>(
      { csrfToken },
      { status: 200 },
    );

    // Set secure cookie for double-submit pattern
    response.cookies.set({
      name: CSRF_TOKEN_COOKIE,
      value: csrfToken,
      httpOnly: true, // Prevent JavaScript access (XSS protection)
      sameSite: "lax", // Allow navigation but prevent cross-site requests
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      maxAge: 1800, // 30 minutes in seconds
      path: "/", // Available to entire application
    });

    return response;
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/session" },
    });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate CSRF token", details: errorMessage },
      { status: 500 },
    );
  }
}
