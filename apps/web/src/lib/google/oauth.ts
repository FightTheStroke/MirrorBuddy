/**
 * Google OAuth Service
 * ADR 0038 - Google Drive Integration
 *
 * Server-side OAuth flow implementation.
 * Handles authorization URL generation, token exchange, and refresh.
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { createHash, createHmac, randomBytes } from 'crypto';
import { encryptToken, decryptToken } from '@/lib/security';
import { GOOGLE_OAUTH_ENDPOINTS, getGoogleOAuthConfig } from './config';
import type { GoogleTokenResponse, GoogleUserProfile, OAuthState } from './types';

// State expiry: 10 minutes
const STATE_EXPIRY_MS = 10 * 60 * 1000;

// Secret for signing state — fail-fast in production if missing
export function getStateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.COOKIE_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OAUTH_STATE_SECRET or COOKIE_SECRET must be set in production');
  }
  return 'dev-secret-change-in-production';
}

// Lazy-initialized secret: avoids crashing at build time during page data collection
let _stateSecret: string | null = null;
function stateSecret(): string {
  if (!_stateSecret) _stateSecret = getStateSecret();
  return _stateSecret;
}

/**
 * Generate PKCE code verifier (RFC 7636)
 * Creates a cryptographically random string 43-128 characters
 */
export function generateCodeVerifier(): string {
  // 32 bytes = 43 characters in base64url (after removing padding)
  return randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier (RFC 7636)
 * Uses SHA-256 hash of the verifier, base64url encoded
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

/**
 * Generate OAuth authorization URL
 * Includes state parameter for CSRF protection and PKCE for security
 */
export function generateAuthUrl(state: OAuthState): string | null {
  const config = getGoogleOAuthConfig();
  if (!config) return null;

  // Generate PKCE code challenge from the verifier in state
  const codeChallenge = generateCodeChallenge(state.codeVerifier);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Always show consent to get refresh token
    state: encodeState(state),
    // PKCE parameters
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${GOOGLE_OAUTH_ENDPOINTS.authorization}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * Includes PKCE code_verifier for security
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
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
      // PKCE: Include code verifier
      code_verifier: codeVerifier,
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
  refreshToken: string,
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
export async function getGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile | null> {
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
  const response = await fetch(`${GOOGLE_OAUTH_ENDPOINTS.revoke}?token=${token}`, {
    method: 'POST',
  });

  return response.ok;
}

/**
 * Get valid access token for a user
 * Automatically refreshes if expired
 * Tokens are decrypted from storage before use
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
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
    // Token still valid - decrypt before returning
    return await decryptToken(account.accessToken);
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

  // Decrypt refresh token for use with Google API
  const decryptedRefreshToken = await decryptToken(account.refreshToken);
  const newTokens = await refreshAccessToken(decryptedRefreshToken);
  if (!newTokens) {
    // Refresh failed, mark as disconnected
    await prisma.googleAccount.update({
      where: { userId },
      data: { isConnected: false },
    });
    return null;
  }

  // Encrypt new tokens before storing
  const encryptedAccessToken = await encryptToken(newTokens.access_token);
  const encryptedRefreshToken = newTokens.refresh_token
    ? await encryptToken(newTokens.refresh_token)
    : undefined;

  // Update stored tokens (encrypted)
  await prisma.googleAccount.update({
    where: { userId },
    data: {
      accessToken: encryptedAccessToken,
      expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
      lastUsedAt: new Date(),
      // Refresh token is only returned on first authorization
      ...(encryptedRefreshToken && {
        refreshToken: encryptedRefreshToken,
      }),
    },
  });

  return newTokens.access_token;
}

/**
 * Save Google account after successful OAuth
 * Tokens are encrypted before storage
 */
export async function saveGoogleAccount(
  userId: string,
  tokens: GoogleTokenResponse,
  profile: GoogleUserProfile,
): Promise<void> {
  const scopes = tokens.scope.split(' ');
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Encrypt tokens before storing
  const encryptedAccessToken = await encryptToken(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token)
    : null;

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
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
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
      accessToken: encryptedAccessToken,
      // Only update refresh token if provided
      ...(encryptedRefreshToken && {
        refreshToken: encryptedRefreshToken,
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
export async function disconnectGoogleAccount(userId: string): Promise<boolean> {
  const account = await prisma.googleAccount.findUnique({
    where: { userId },
  });

  if (!account) return false;

  // Revoke tokens at Google (need to decrypt first)
  if (account.accessToken) {
    const decryptedToken = await decryptToken(account.accessToken);
    await revokeToken(decryptedToken);
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
 * Sign data with HMAC-SHA256
 */
function signData(data: string): string {
  return createHmac('sha256', stateSecret()).update(data).digest('base64url');
}

/**
 * Encode OAuth state for URL with cryptographic signature
 * Format: {base64url(state)}.{signature}
 */
export function encodeState(state: OAuthState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
  const signature = signData(payload);
  return `${payload}.${signature}`;
}

/**
 * Decode and verify OAuth state from URL
 * Validates signature and checks expiry
 */
export function decodeState(encoded: string): OAuthState | null {
  try {
    const parts = encoded.split('.');
    if (parts.length !== 2) {
      logger.warn('[OAuth] Invalid state format - missing signature');
      return null;
    }

    const [payload, signature] = parts;

    // Verify signature
    const expectedSignature = signData(payload);
    if (signature !== expectedSignature) {
      logger.warn('[OAuth] Invalid state signature - possible tampering');
      return null;
    }

    // Decode payload
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    const state = JSON.parse(decoded) as OAuthState;

    // Check expiry
    if (state.createdAt && Date.now() - state.createdAt > STATE_EXPIRY_MS) {
      logger.warn('[OAuth] State expired', {
        createdAt: state.createdAt,
        ageMs: Date.now() - state.createdAt,
      });
      return null;
    }

    return state;
  } catch (error) {
    logger.error('[OAuth] Failed to decode state', { error: String(error) });
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
