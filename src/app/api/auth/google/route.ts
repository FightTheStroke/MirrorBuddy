/**
 * Google OAuth Initiation
 * GET /api/auth/google
 *
 * Starts the OAuth flow by redirecting to Google's consent screen.
 * Requires userId in query params (from session/cookie in production).
 */

import { NextResponse } from "next/server";
import {
  generateAuthUrl,
  generateNonce,
  generateCodeVerifier,
  isGoogleOAuthConfigured,
} from "@/lib/google";
import { RATE_LIMITS } from "@/lib/rate-limit";
import {
  pipe,
  withSentry,
  withAuth,
  withRateLimit,
} from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/auth/google"),
  withAuth,
  withRateLimit(RATE_LIMITS.AUTH_OAUTH),
)(async (ctx) => {
  // Check if Google OAuth is configured
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(ctx.req.url);
  const returnUrl = searchParams.get("returnUrl") || "/settings";

  // Generate PKCE code verifier for secure authorization code exchange
  const codeVerifier = generateCodeVerifier();

  // Generate OAuth URL with state for CSRF protection and PKCE
  const authUrl = generateAuthUrl({
    userId: ctx.userId!,
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
});
