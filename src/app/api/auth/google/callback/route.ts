/**
 * Google OAuth Callback
 * GET /api/auth/google/callback
 *
 * Handles the OAuth callback from Google.
 * Exchanges authorization code for tokens and saves to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  decodeState,
  exchangeCodeForTokens,
  getGoogleUserProfile,
  saveGoogleAccount,
} from '@/lib/google';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  // Determine base URL for redirects
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || process.env.VERCEL_URL
    || 'http://localhost:3000';

  // Handle OAuth errors from Google
  if (error) {
    console.error('[Google OAuth] Error from Google:', error);
    const errorUrl = new URL('/settings', baseUrl);
    errorUrl.searchParams.set('google_error', error);
    return NextResponse.redirect(errorUrl.toString());
  }

  // Validate required params
  if (!code || !stateParam) {
    const errorUrl = new URL('/settings', baseUrl);
    errorUrl.searchParams.set('google_error', 'missing_params');
    return NextResponse.redirect(errorUrl.toString());
  }

  // Decode and validate state
  const state = decodeState(stateParam);
  if (!state || !state.userId) {
    const errorUrl = new URL('/settings', baseUrl);
    errorUrl.searchParams.set('google_error', 'invalid_state');
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      throw new Error('Failed to exchange code for tokens');
    }

    // Get user profile from Google
    const profile = await getGoogleUserProfile(tokens.access_token);
    if (!profile) {
      throw new Error('Failed to get user profile');
    }

    // Save to database
    await saveGoogleAccount(state.userId, tokens, profile);

    // Redirect to success
    const returnUrl = state.returnUrl || '/settings';
    const successUrl = new URL(returnUrl, baseUrl);
    successUrl.searchParams.set('google_connected', 'true');
    return NextResponse.redirect(successUrl.toString());

  } catch (err) {
    console.error('[Google OAuth] Callback error:', err);
    const errorUrl = new URL('/settings', baseUrl);
    errorUrl.searchParams.set('google_error', 'callback_failed');
    return NextResponse.redirect(errorUrl.toString());
  }
}
