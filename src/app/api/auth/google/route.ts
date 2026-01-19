/**
 * Google OAuth Initiation
 * GET /api/auth/google
 *
 * Starts the OAuth flow by redirecting to Google's consent screen.
 * Requires userId in query params (from session/cookie in production).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session-auth";
import {
  generateAuthUrl,
  generateNonce,
  generateCodeVerifier,
  isGoogleOAuthConfigured,
} from "@/lib/google";
import {
  checkRateLimitAsync,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit OAuth initiation (10 per minute)
  const clientId = getClientIdentifier(request);
  const rateLimitResult = await checkRateLimitAsync(
    `auth:oauth:${clientId}`,
    RATE_LIMITS.AUTH_OAUTH,
  );
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  // Check if Google OAuth is configured
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 503 },
    );
  }

  // Security: Get userId from authenticated session only
  const { userId, errorResponse } = await requireAuthenticatedUser();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get("returnUrl") || "/settings";

  // Generate PKCE code verifier for secure authorization code exchange
  const codeVerifier = generateCodeVerifier();

  // Generate OAuth URL with state for CSRF protection and PKCE
  const authUrl = generateAuthUrl({
    userId: userId!,
    returnUrl,
    nonce: generateNonce(),
    codeVerifier,
    createdAt: Date.now(),
  });

  if (!authUrl) {
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 },
    );
  }

  // Redirect to Google consent screen
  return NextResponse.redirect(authUrl);
}
