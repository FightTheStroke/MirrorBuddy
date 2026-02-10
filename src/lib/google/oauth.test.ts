import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    googleAccount: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    user: { upsert: vi.fn() },
  },
}));

vi.mock('@/lib/security', () => ({
  encryptToken: vi.fn((v: string) => Promise.resolve(`enc_${v}`)),
  decryptToken: vi.fn((v: string) => Promise.resolve(v.replace('enc_', ''))),
}));

vi.mock('./config', () => ({
  getGoogleOAuthConfig: vi.fn(() => null),
  GOOGLE_OAUTH_ENDPOINTS: {
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://www.googleapis.com/oauth2/v3/userinfo',
    revoke: 'https://oauth2.googleapis.com/revoke',
  },
}));

import { getStateSecret } from './oauth';

describe('getStateSecret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should throw in production if no secrets configured', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OAUTH_STATE_SECRET', '');
    vi.stubEnv('COOKIE_SECRET', '');

    // Act & Assert
    expect(() => getStateSecret()).toThrow('OAUTH_STATE_SECRET or COOKIE_SECRET must be set');
  });

  it('should return dev-secret fallback in development', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('OAUTH_STATE_SECRET', '');
    vi.stubEnv('COOKIE_SECRET', '');

    // Act
    const secret = getStateSecret();

    // Assert
    expect(secret).toBe('dev-secret-change-in-production');
  });
});
