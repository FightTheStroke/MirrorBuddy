// ============================================================================
// OIDC PROVIDER ABSTRACTION
// Generic OpenID Connect provider interface for SSO integration
// Supports multiple identity providers (Google Workspace, Microsoft 365, etc.)
// Created for F-04: School Admin SSO Integration
// ============================================================================

/**
 * OIDC token response from the authorization server
 */
export interface OIDCTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token: string;
  scope?: string;
}

/**
 * Standard OIDC user info claims
 * Based on OpenID Connect Core 1.0 specification
 */
export interface OIDCUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  [key: string]: unknown;
}

/**
 * Authorization URL result with state and code verifier for PKCE
 */
export interface AuthorizationURLResult {
  url: string;
  state: string;
  codeVerifier: string;
  nonce: string;
}

/**
 * Configuration for OIDC provider
 */
export interface OIDCProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  additionalParams?: Record<string, string>;
}

/**
 * Callback parameters received from authorization server
 */
export interface CallbackParams {
  code: string;
  state: string;
  codeVerifier: string;
  nonce?: string;
}

/**
 * Result from successful callback processing
 */
export interface CallbackResult {
  tokens: OIDCTokenResponse;
  userInfo: OIDCUserInfo;
  verifiedClaims?: Record<string, unknown>;
}

/**
 * Generic OpenID Connect provider interface
 * Implements OAuth 2.0 Authorization Code Flow with PKCE
 *
 * All providers must implement these methods to ensure
 * consistent SSO behavior across different identity providers
 */
export interface OIDCProvider {
  /**
   * Generate authorization URL for redirecting user to identity provider
   *
   * Implements PKCE (RFC 7636) for enhanced security:
   * - Generates code_verifier and code_challenge
   * - Includes state parameter for CSRF protection
   * - Includes nonce for replay attack prevention
   *
   * @param config - Provider configuration including client ID, redirect URI, scopes
   * @returns Authorization URL with PKCE parameters, state, and nonce
   */
  authorize(config: OIDCProviderConfig): Promise<AuthorizationURLResult>;

  /**
   * Handle OAuth callback and exchange authorization code for tokens
   *
   * Security considerations:
   * - Validates state parameter to prevent CSRF
   * - Verifies code_verifier matches code_challenge (PKCE)
   * - Validates ID token signature and claims
   * - Checks nonce to prevent replay attacks
   *
   * @param params - Authorization code, state, and code verifier from authorization flow
   * @param config - Provider configuration for token exchange
   * @returns Access token, ID token, and user info
   * @throws Error if state validation fails, token exchange fails, or ID token is invalid
   */
  callback(params: CallbackParams, config: OIDCProviderConfig): Promise<CallbackResult>;

  /**
   * Fetch user information from the provider's UserInfo endpoint
   *
   * Uses the access token to retrieve user profile information
   * according to the scopes granted during authorization
   *
   * @param accessToken - Valid access token from token response
   * @returns User profile information with standard OIDC claims
   * @throws Error if token is invalid or UserInfo endpoint fails
   */
  getUserInfo(accessToken: string): Promise<OIDCUserInfo>;
}

/**
 * OIDC discovery document structure
 * Based on OpenID Connect Discovery 1.0 specification
 */
export interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  scopes_supported?: string[];
  claims_supported?: string[];
  code_challenge_methods_supported?: string[];
}

/**
 * Base error for OIDC provider operations
 */
export class OIDCProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'OIDCProviderError';
  }
}

/**
 * Error thrown when authorization URL generation fails
 */
export class AuthorizationError extends OIDCProviderError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error thrown when callback processing fails
 */
export class CallbackError extends OIDCProviderError {
  constructor(message: string, details?: unknown) {
    super(message, 'CALLBACK_ERROR', details);
    this.name = 'CallbackError';
  }
}

/**
 * Error thrown when token validation fails
 */
export class TokenValidationError extends OIDCProviderError {
  constructor(message: string, details?: unknown) {
    super(message, 'TOKEN_VALIDATION_ERROR', details);
    this.name = 'TokenValidationError';
  }
}

/**
 * Error thrown when UserInfo fetch fails
 */
export class UserInfoError extends OIDCProviderError {
  constructor(message: string, details?: unknown) {
    super(message, 'USERINFO_ERROR', details);
    this.name = 'UserInfoError';
  }
}
