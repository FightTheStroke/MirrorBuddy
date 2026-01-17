/**
 * Google OAuth Service
 * ADR 0038 - Google Drive Integration
 *
 * Server-side OAuth flow implementation.
 * Handles authorization URL generation, token exchange, and refresh.
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import {
  GOOGLE_OAUTH_ENDPOINTS,
  getGoogleOAuthConfig,
} from './config';
import type {
  GoogleTokenResponse,
  GoogleUserProfile,
  OAuthState,
} from './types';

/**
 * Generate OAuth authorization URL
 * Includes state parameter for CSRF protection
 */
export function generateAuthUrl(state: OAuthState): string | null {
  const config = getGoogleOAuthConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Always show consent to get refresh token
    state: encodeState(state),
  });

  return `${GOOGLE_OAUTH_ENDPOINTS.authorization}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokenResponse | null> {
  const config = getGoogleOAuthConfig();
  if (!config) return null;

  const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[Google OAuth] Token exchange failed', { errorText });
    return null;
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokenResponse | null> {
  const config = getGoogleOAuthConfig();
  if (!config) return null;

  const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[Google OAuth] Token refresh failed', { errorText });
    return null;
  }

  return response.json();
}

/**
 * Get user profile from Google
 */
export async function getGoogleUserProfile(
  accessToken: string
): Promise<GoogleUserProfile | null> {
  const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.userinfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('[Google OAuth] Failed to get user profile');
    return null;
  }

  return response.json();
}

/**
 * Revoke Google OAuth tokens
 */
export async function revokeToken(token: string): Promise<boolean> {
  const response = await fetch(
    `${GOOGLE_OAUTH_ENDPOINTS.revoke}?token=${token}`,
    { method: 'POST' }
  );

  return response.ok;
}

/**
 * Get valid access token for a user
 * Automatically refreshes if expired
 */
export async function getValidAccessToken(
  userId: string
): Promise<string | null> {
  const account = await prisma.googleAccount.findUnique({
    where: { userId },
  });

  if (!account || !account.isConnected) {
    return null;
  }

  // Check if token is expired (with 5 min buffer)
  const now = new Date();
  const expiresAt = new Date(account.expiresAt);
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token still valid
    return account.accessToken;
  }

  // Token expired, try to refresh
  if (!account.refreshToken) {
    // No refresh token, user needs to re-authenticate
    await prisma.googleAccount.update({
      where: { userId },
      data: { isConnected: false },
    });
    return null;
  }

  const newTokens = await refreshAccessToken(account.refreshToken);
  if (!newTokens) {
    // Refresh failed, mark as disconnected
    await prisma.googleAccount.update({
      where: { userId },
      data: { isConnected: false },
    });
    return null;
  }

  // Update stored tokens
  await prisma.googleAccount.update({
    where: { userId },
    data: {
      accessToken: newTokens.access_token,
      expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
      lastUsedAt: new Date(),
      // Refresh token is only returned on first authorization
      ...(newTokens.refresh_token && {
        refreshToken: newTokens.refresh_token,
      }),
    },
  });

  return newTokens.access_token;
}

/**
 * Save Google account after successful OAuth
 */
export async function saveGoogleAccount(
  userId: string,
  tokens: GoogleTokenResponse,
  profile: GoogleUserProfile
): Promise<void> {
  const scopes = tokens.scope.split(' ');
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Ensure user exists before creating GoogleAccount (foreign key constraint)
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {},
  });

  await prisma.googleAccount.upsert({
    where: { userId },
    create: {
      userId,
      googleId: profile.id,
      email: profile.email,
      displayName: profile.name || null,
      avatarUrl: profile.picture || null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenType: tokens.token_type,
      expiresAt,
      scopes: JSON.stringify(scopes),
      isConnected: true,
      lastUsedAt: new Date(),
    },
    update: {
      googleId: profile.id,
      email: profile.email,
      displayName: profile.name || null,
      avatarUrl: profile.picture || null,
      accessToken: tokens.access_token,
      // Only update refresh token if provided
      ...(tokens.refresh_token && {
        refreshToken: tokens.refresh_token,
      }),
      tokenType: tokens.token_type,
      expiresAt,
      scopes: JSON.stringify(scopes),
      isConnected: true,
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Disconnect Google account
 */
export async function disconnectGoogleAccount(
  userId: string
): Promise<boolean> {
  const account = await prisma.googleAccount.findUnique({
    where: { userId },
  });

  if (!account) return false;

  // Revoke tokens at Google
  if (account.accessToken) {
    await revokeToken(account.accessToken);
  }

  // Mark as disconnected (keep record for potential reconnection)
  await prisma.googleAccount.update({
    where: { userId },
    data: {
      isConnected: false,
      accessToken: '',
      refreshToken: null,
    },
  });

  return true;
}

/**
 * Encode OAuth state for URL
 */
export function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

/**
 * Decode OAuth state from URL
 */
export function decodeState(encoded: string): OAuthState | null {
  try {
    const decoded = Buffer.from(encoded, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Generate a random nonce for CSRF protection
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
