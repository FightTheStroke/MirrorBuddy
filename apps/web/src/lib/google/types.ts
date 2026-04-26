/**
 * Google OAuth and Drive types
 * ADR 0038 - Google Drive Integration
 */

// OAuth token response from Google
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

// Google user profile from userinfo endpoint
export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

// Stored Google account (matches Prisma model)
export interface StoredGoogleAccount {
  id: string;
  userId: string;
  googleId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: Date;
  scopes: string[];
  isConnected: boolean;
  lastUsedAt: Date;
}

// OAuth state for CSRF protection with PKCE
export interface OAuthState {
  userId: string;
  returnUrl?: string;
  nonce: string;
  /** PKCE code verifier - stored in state, used during token exchange */
  codeVerifier: string;
  /** Timestamp when state was created (for expiry check) */
  createdAt: number;
}

// Connection status for UI
export interface GoogleConnectionStatus {
  isConnected: boolean;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  expiresAt?: Date;
  scopes?: string[];
}
