import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenValidationError } from './oidc-provider';

// Mock jose
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks-fn'),
  jwtVerify: vi.fn(),
}));

import { verifyIdToken, decodeJWT } from './oidc-utils';
import { jwtVerify } from 'jose';

const mockJwtVerify = vi.mocked(jwtVerify);

describe('verifyIdToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify token with correct issuer and audience', async () => {
    // Arrange
    const payload = {
      sub: '123',
      email: 'user@school.edu',
      iss: 'https://accounts.google.com',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    mockJwtVerify.mockResolvedValue({
      payload,
      protectedHeader: { alg: 'RS256' },
    } as never);

    // Act
    const result = await verifyIdToken(
      'mock.jwt.token',
      'https://www.googleapis.com/oauth2/v3/certs',
      'https://accounts.google.com',
      'client-id',
    );

    // Assert
    expect(result).toEqual(payload);
    expect(mockJwtVerify).toHaveBeenCalledWith('mock.jwt.token', 'mock-jwks-fn', {
      issuer: 'https://accounts.google.com',
      audience: 'client-id',
    });
  });

  it('should validate nonce when provided', async () => {
    // Arrange
    const payload = {
      sub: '123',
      nonce: 'expected-nonce',
    };
    mockJwtVerify.mockResolvedValue({
      payload,
      protectedHeader: { alg: 'RS256' },
    } as never);

    // Act
    const result = await verifyIdToken(
      'mock.jwt.token',
      'https://jwks.example.com',
      'https://issuer.example.com',
      'client-id',
      'expected-nonce',
    );

    // Assert
    expect(result).toEqual(payload);
  });

  it('should throw on nonce mismatch', async () => {
    // Arrange
    const payload = {
      sub: '123',
      nonce: 'wrong-nonce',
    };
    mockJwtVerify.mockResolvedValue({
      payload,
      protectedHeader: { alg: 'RS256' },
    } as never);

    // Act & Assert
    await expect(
      verifyIdToken(
        'mock.jwt.token',
        'https://jwks.example.com',
        'https://issuer.example.com',
        'client-id',
        'expected-nonce',
      ),
    ).rejects.toThrow(TokenValidationError);
  });

  it('should throw TokenValidationError on jose failure', async () => {
    // Arrange
    mockJwtVerify.mockRejectedValue(new Error('Invalid signature'));

    // Act & Assert
    await expect(
      verifyIdToken(
        'invalid.jwt',
        'https://jwks.example.com',
        'https://issuer.example.com',
        'client-id',
      ),
    ).rejects.toThrow(TokenValidationError);
  });

  it('should accept array of issuers', async () => {
    // Arrange
    const payload = { sub: '123' };
    mockJwtVerify.mockResolvedValue({
      payload,
      protectedHeader: { alg: 'RS256' },
    } as never);

    // Act
    await verifyIdToken(
      'mock.jwt.token',
      'https://jwks.example.com',
      ['https://issuer1.com', 'https://issuer2.com'],
      'client-id',
    );

    // Assert
    expect(mockJwtVerify).toHaveBeenCalledWith('mock.jwt.token', 'mock-jwks-fn', {
      issuer: ['https://issuer1.com', 'https://issuer2.com'],
      audience: 'client-id',
    });
  });
});

describe('decodeJWT', () => {
  it('should decode valid JWT', () => {
    const payload = { sub: '123', email: 'test@example.com' };
    const jwt = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

    const result = decodeJWT(jwt);
    expect(result).toEqual(payload);
  });

  it('should throw on invalid JWT format', () => {
    expect(() => decodeJWT('not-a-jwt')).toThrow(TokenValidationError);
  });
});
