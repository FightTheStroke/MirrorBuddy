/**
 * Google OAuth Initiation
 * GET /api/auth/google
 *
 * Starts the OAuth flow by redirecting to Google's consent screen.
 * Requires userId in query params (from session/cookie in production).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAuthUrl,
  generateNonce,
  isGoogleOAuthConfigured,
} from '@/lib/google';

export async function GET(request: NextRequest) {
  // Check if Google OAuth is configured
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: 'Google OAuth not configured' },
      { status: 503 }
    );
  }

  // Get userId from query params
  // In production, this should come from an authenticated session
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const returnUrl = searchParams.get('returnUrl') || '/settings';

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  // Generate OAuth URL with state for CSRF protection
  const authUrl = generateAuthUrl({
    userId,
    returnUrl,
    nonce: generateNonce(),
  });

  if (!authUrl) {
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }

  // Redirect to Google consent screen
  return NextResponse.redirect(authUrl);
}
