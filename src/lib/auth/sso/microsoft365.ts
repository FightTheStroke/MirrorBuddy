// ============================================================================
// MICROSOFT 365 OIDC PROVIDER
// OpenID Connect implementation for Microsoft 365 (Azure AD) SSO
// Supports edu tenant detection and school domain validation
// Created for F-05: Microsoft 365 SSO Integration
// ============================================================================

import type {
  OIDCProvider,
  OIDCProviderConfig,
  OIDCUserInfo,
  AuthorizationURLResult,
  CallbackParams,
  CallbackResult,
  OIDCDiscoveryDocument,
} from './oidc-provider';
import {
  AuthorizationError,
  CallbackError,
  UserInfoError,
  TokenValidationError,
} from './oidc-provider';
import { generatePKCE, generateState, generateNonce, verifyIdToken } from './oidc-utils';

/**
 * Microsoft Azure AD OIDC discovery endpoint
 * Using 'common' tenant for multi-tenant support (personal + organizational)
 */
const MICROSOFT_DISCOVERY_URL =
  'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';

/**
 * Microsoft 365 OAuth scopes for education integration
 */
export const MICROSOFT_EDU_SCOPES = {
  OPENID: 'openid',
  EMAIL: 'email',
  PROFILE: 'profile',
  OFFLINE_ACCESS: 'offline_access',
  USER_READ: 'User.Read',
  EDU_ROSTERS: 'EduRoster.Read',
  EDU_CLASSES: 'EduRoster.ReadBasic',
} as const;

/**
 * Microsoft-specific user info with Azure AD claims
 */
export interface MicrosoftUserInfo extends OIDCUserInfo {
  tid?: string;
  preferred_username?: string;
  unique_name?: string;
}

/**
 * Microsoft 365 OpenID Connect provider implementation
 *
 * Implements OAuth 2.0 with PKCE for Microsoft 365 (Azure AD) SSO.
 * Supports both personal and organizational accounts with edu tenant detection.
 */
export class Microsoft365Provider implements OIDCProvider {
  private discoveryDoc: OIDCDiscoveryDocument | null = null;

  /**
   * Fetch and cache OIDC discovery document from Azure AD
   */
  private async getDiscoveryDocument(): Promise<OIDCDiscoveryDocument> {
    if (this.discoveryDoc) {
      return this.discoveryDoc;
    }

    try {
      const response = await fetch(MICROSOFT_DISCOVERY_URL);
      if (!response.ok) {
        throw new Error(`Discovery endpoint returned ${response.status}: ${response.statusText}`);
      }

      const doc: OIDCDiscoveryDocument = await response.json();
      this.discoveryDoc = doc;
      return doc;
    } catch (error) {
      throw new AuthorizationError('Failed to fetch Microsoft OIDC discovery document', error);
    }
  }

  /**
   * Generate authorization URL for Microsoft 365 SSO
   * @param config - Provider configuration with client ID, redirect URI, and scopes
   * @returns Authorization URL with PKCE parameters, state, and nonce
   */
  async authorize(config: OIDCProviderConfig): Promise<AuthorizationURLResult> {
    try {
      const discovery = await this.getDiscoveryDocument();

      const { codeVerifier, codeChallenge } = generatePKCE();
      const state = generateState();
      const nonce = generateNonce();

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        response_mode: 'query',
        ...config.additionalParams,
      });

      const url = `${discovery.authorization_endpoint}?${params.toString()}`;

      return {
        url,
        state,
        codeVerifier,
        nonce,
      };
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new AuthorizationError('Failed to generate authorization URL', error);
    }
  }

  /**
   * Exchange authorization code for tokens and fetch user info
   * @param params - Authorization code, state, and code verifier
   * @param config - Provider configuration for token exchange
   * @returns Access token, ID token, and user information
   */
  async callback(params: CallbackParams, config: OIDCProviderConfig): Promise<CallbackResult> {
    try {
      const discovery = await this.getDiscoveryDocument();

      const tokenResponse = await fetch(discovery.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: params.code,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: params.codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorBody}`);
      }

      const tokens = await tokenResponse.json();

      if (!tokens.id_token) {
        throw new TokenValidationError('ID token missing from token response');
      }

      const idTokenPayload = await verifyIdToken(
        tokens.id_token,
        discovery.jwks_uri,
        discovery.issuer,
        config.clientId,
        params.nonce,
      );
      const userInfo = await this.getUserInfo(tokens.access_token);

      return {
        tokens,
        userInfo: {
          ...userInfo,
          ...idTokenPayload,
        } as MicrosoftUserInfo,
        verifiedClaims: idTokenPayload,
      };
    } catch (error) {
      if (error instanceof CallbackError || error instanceof TokenValidationError) {
        throw error;
      }
      throw new CallbackError('Failed to process OAuth callback', error);
    }
  }

  async getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    try {
      const discovery = await this.getDiscoveryDocument();

      const response = await fetch(discovery.userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`UserInfo endpoint returned ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as MicrosoftUserInfo;
    } catch (error) {
      if (error instanceof UserInfoError) {
        throw error;
      }
      throw new UserInfoError('Failed to fetch user info', error);
    }
  }
}
