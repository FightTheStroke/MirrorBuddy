// ============================================================================
// GOOGLE WORKSPACE OIDC PROVIDER
// OpenID Connect implementation for Google Workspace (G Suite) SSO
// Supports edu-specific scopes for Classroom and Directory API
// Created for F-04: School Admin SSO Integration
// ============================================================================

import {
  type OIDCProvider,
  type OIDCProviderConfig,
  type AuthorizationURLResult,
  type CallbackParams,
  type CallbackResult,
  type OIDCUserInfo,
  type OIDCDiscoveryDocument,
  AuthorizationError,
  CallbackError,
  UserInfoError,
  TokenValidationError,
} from "./oidc-provider";
import {
  generatePKCE,
  generateState,
  generateNonce,
  decodeJWT,
} from "./oidc-utils";

const GOOGLE_DISCOVERY_URL =
  "https://accounts.google.com/.well-known/openid-configuration";

export const GOOGLE_EDU_SCOPES = {
  OPENID: "openid",
  EMAIL: "email",
  PROFILE: "profile",
  CLASSROOM_COURSES:
    "https://www.googleapis.com/auth/classroom.courses.readonly",
  CLASSROOM_ROSTERS:
    "https://www.googleapis.com/auth/classroom.rosters.readonly",
  DIRECTORY_USER:
    "https://www.googleapis.com/auth/admin.directory.user.readonly",
  DIRECTORY_GROUP:
    "https://www.googleapis.com/auth/admin.directory.group.readonly",
} as const;

export interface GoogleUserInfo extends OIDCUserInfo {
  hd?: string;
}

export class GoogleWorkspaceProvider implements OIDCProvider {
  private discoveryDoc: OIDCDiscoveryDocument | null = null;

  private async getDiscoveryDocument(): Promise<OIDCDiscoveryDocument> {
    if (this.discoveryDoc) {
      return this.discoveryDoc;
    }

    try {
      const response = await fetch(GOOGLE_DISCOVERY_URL);
      if (!response.ok) {
        throw new Error(
          `Discovery endpoint returned ${response.status}: ${response.statusText}`,
        );
      }

      const doc: OIDCDiscoveryDocument = await response.json();
      this.discoveryDoc = doc;
      return doc;
    } catch (error) {
      throw new AuthorizationError(
        "Failed to fetch Google OIDC discovery document",
        error,
      );
    }
  }

  async authorize(config: OIDCProviderConfig): Promise<AuthorizationURLResult> {
    try {
      const discovery = await this.getDiscoveryDocument();

      const { codeVerifier, codeChallenge } = generatePKCE();
      const state = generateState();
      const nonce = generateNonce();

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        scope: config.scopes.join(" "),
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        access_type: "offline",
        prompt: "consent",
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
      throw new AuthorizationError(
        "Failed to generate authorization URL",
        error,
      );
    }
  }

  async callback(
    params: CallbackParams,
    config: OIDCProviderConfig,
  ): Promise<CallbackResult> {
    try {
      const discovery = await this.getDiscoveryDocument();

      const tokenResponse = await fetch(discovery.token_endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: params.code,
          redirect_uri: config.redirectUri,
          grant_type: "authorization_code",
          code_verifier: params.codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        throw new Error(
          `Token exchange failed: ${tokenResponse.status} ${errorBody}`,
        );
      }

      const tokens = await tokenResponse.json();

      if (!tokens.id_token) {
        throw new TokenValidationError("ID token missing from token response");
      }

      const idTokenPayload = this.decodeIdToken(tokens.id_token);
      const userInfo = await this.getUserInfo(tokens.access_token);

      return {
        tokens,
        userInfo: {
          ...userInfo,
          ...idTokenPayload,
        },
      };
    } catch (error) {
      if (
        error instanceof CallbackError ||
        error instanceof TokenValidationError
      ) {
        throw error;
      }
      throw new CallbackError("Failed to process OAuth callback", error);
    }
  }

  private decodeIdToken(idToken: string): GoogleUserInfo {
    return decodeJWT(idToken) as GoogleUserInfo;
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const discovery = await this.getDiscoveryDocument();

      const response = await fetch(discovery.userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `UserInfo endpoint returned ${response.status}: ${response.statusText}`,
        );
      }

      return (await response.json()) as GoogleUserInfo;
    } catch (error) {
      if (error instanceof UserInfoError) {
        throw error;
      }
      throw new UserInfoError("Failed to fetch user info", error);
    }
  }
}
