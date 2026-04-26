/**
 * Tests for Microsoft365Provider
 * Tests Azure AD OIDC integration with edu tenant detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Microsoft365Provider } from './microsoft365';
import type { OIDCProviderConfig } from './oidc-provider';

// Mock verifyIdToken since we test it separately in oidc-utils.test.ts
vi.mock('./oidc-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./oidc-utils')>();
  return {
    ...actual,
    verifyIdToken: vi.fn(),
  };
});

import { verifyIdToken } from './oidc-utils';

describe('Microsoft365Provider', () => {
  let provider: Microsoft365Provider;
  let config: OIDCProviderConfig;

  beforeEach(() => {
    provider = new Microsoft365Provider();
    config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback',
      scopes: ['openid', 'email', 'profile'],
    };

    // Mock fetch for discovery document
    global.fetch = vi.fn();
  });

  describe('authorize', () => {
    it('generates authorization URL with PKCE parameters', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issuer: 'https://login.microsoftonline.com/common/v2.0',
          authorization_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
          jwks_uri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
          response_types_supported: ['code'],
          subject_types_supported: ['pairwise'],
          id_token_signing_alg_values_supported: ['RS256'],
        }),
      } as Response);

      const result = await provider.authorize(config);

      expect(result.url).toContain('login.microsoftonline.com');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('redirect_uri=');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('scope=openid+email+profile');
      expect(result.url).toContain('code_challenge=');
      expect(result.url).toContain('code_challenge_method=S256');
      expect(result.state).toBeTruthy();
      expect(result.codeVerifier).toBeTruthy();
      expect(result.nonce).toBeTruthy();
    });

    it('includes additional parameters when provided', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issuer: 'https://login.microsoftonline.com/common/v2.0',
          authorization_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
          jwks_uri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
          response_types_supported: ['code'],
          subject_types_supported: ['pairwise'],
          id_token_signing_alg_values_supported: ['RS256'],
        }),
      } as Response);

      const configWithParams: OIDCProviderConfig = {
        ...config,
        additionalParams: {
          domain_hint: 'school.edu',
          prompt: 'select_account',
        },
      };

      const result = await provider.authorize(configWithParams);

      expect(result.url).toContain('domain_hint=school.edu');
      expect(result.url).toContain('prompt=select_account');
    });
  });

  describe('callback', () => {
    it('exchanges authorization code for tokens and user info', async () => {
      const mockTokens = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        id_token:
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsImlzcyI6Imh0dHBzOi8vbG9naW4ubWljcm9zb2Z0b25saW5lLmNvbSIsImF1ZCI6InRlc3QtY2xpZW50LWlkIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature',
      };

      const mockUserInfo = {
        sub: '1234567890',
        email: 'test@example.com',
        name: 'Test User',
        email_verified: true,
      };

      // Mock discovery fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issuer: 'https://login.microsoftonline.com/common/v2.0',
          authorization_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
          jwks_uri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
          response_types_supported: ['code'],
          subject_types_supported: ['pairwise'],
          id_token_signing_alg_values_supported: ['RS256'],
        }),
      } as Response);

      // Mock token exchange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens,
      } as Response);

      // Mock userinfo fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo,
      } as Response);

      // Mock verifyIdToken to return decoded claims
      vi.mocked(verifyIdToken).mockResolvedValueOnce({
        sub: '1234567890',
        email: 'test@example.com',
        name: 'Test User',
        iss: 'https://login.microsoftonline.com/common/v2.0',
        aud: 'test-client-id',
      });

      const result = await provider.callback(
        {
          code: 'test-code',
          state: 'test-state',
          codeVerifier: 'test-verifier',
        },
        config,
      );

      expect(result.tokens).toEqual(mockTokens);
      expect(result.userInfo.email).toBe('test@example.com');
      expect(result.userInfo.sub).toBe('1234567890');
    });
  });

  describe('getUserInfo', () => {
    it('fetches user information from Microsoft Graph', async () => {
      const mockUserInfo = {
        sub: '1234567890',
        email: 'test@school.edu',
        name: 'Test User',
        email_verified: true,
      };

      // Mock discovery fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issuer: 'https://login.microsoftonline.com/common/v2.0',
          authorization_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
          jwks_uri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
          response_types_supported: ['code'],
          subject_types_supported: ['pairwise'],
          id_token_signing_alg_values_supported: ['RS256'],
        }),
      } as Response);

      // Mock userinfo fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo,
      } as Response);

      const result = await provider.getUserInfo('mock-access-token');

      expect(result.email).toBe('test@school.edu');
      expect(result.sub).toBe('1234567890');
    });

    it('throws UserInfoError on fetch failure', async () => {
      // Mock discovery fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issuer: 'https://login.microsoftonline.com/common/v2.0',
          authorization_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token_endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
          jwks_uri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
          response_types_supported: ['code'],
          subject_types_supported: ['pairwise'],
          id_token_signing_alg_values_supported: ['RS256'],
        }),
      } as Response);

      // Mock failed userinfo fetch
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(provider.getUserInfo('invalid-token')).rejects.toThrow();
    });
  });
});
