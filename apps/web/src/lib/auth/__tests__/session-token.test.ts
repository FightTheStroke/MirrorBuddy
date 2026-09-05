import { createHash } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetSecretCache,
  CookieSigningError,
  signCookieValue,
  verifyCookieValue,
} from '../cookie-signing';
import { createSessionToken, hashSessionHandle, parseSessionToken } from '../session-token';

const secret = 'synthetic-session-token-secret-at-least-32-characters';
const handle = Buffer.alloc(32, 7).toString('base64url');

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', secret);
  _resetSecretCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  _resetSecretCache();
});

describe('session token foundation', () => {
  it('round-trips an opaque 256-bit handle using the existing signer', () => {
    const issued = createSessionToken();
    const parsed = parseSessionToken(issued.token);

    expect(parsed.valid).toBe(true);
    if (!parsed.valid || parsed.kind !== 'modern') {
      throw new Error('Expected a modern session token');
    }
    expect(parsed.handle).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(parsed.handle, 'base64url')).toHaveLength(32);
    expect(issued.token).toBe(signCookieValue(`s2:${parsed.handle}`).signed);
    expect(parsed.handleHash).toBe(issued.handleHash);
    expect(issued.handleHash).toBe(createHash('sha256').update(parsed.handle).digest('hex'));
    expect(parsed).not.toHaveProperty('userId');
    expect(parsed).not.toHaveProperty('expiresAt');
    // Origin is server-owned: modern envelopes can also carry upgraded legacy sessions.
    expect(parsed).not.toHaveProperty('legacyOrigin');
    expect(Object.keys(issued).sort()).toEqual(['handleHash', 'token']);
  });

  it('generates independent random handles rather than user-derived credentials', () => {
    const credentials = Array.from({ length: 64 }, () => createSessionToken());
    expect(new Set(credentials.map(({ token }) => token)).size).toBe(64);
    expect(new Set(credentials.map(({ handleHash }) => handleHash)).size).toBe(64);
  });

  it('does not accept a stored hash as a bearer or as a signed handle', () => {
    const issued = createSessionToken();
    expect(issued.handleHash).toMatch(/^[0-9a-f]{64}$/);
    const signature = issued.token.split('.')[1];
    for (const token of [
      issued.handleHash,
      `s2:${issued.handleHash}.${signature}`,
      signCookieValue(`s2:${issued.handleHash}`).signed,
      `${issued.handleHash}.${signature}`,
    ]) {
      expect(parseSessionToken(token).valid).toBe(false);
    }
    const reencodedHash = Buffer.from(issued.handleHash, 'hex').toString('base64url');
    expect(hashSessionHandle(reencodedHash)).not.toBe(issued.handleHash);
    expect(parseSessionToken(`s2:${reencodedHash}.${signature}`).valid).toBe(false);
  });

  it.each(['user-123', 'cm0legacy123', 'a1b2c3d4-e5f6-4789-9012-345678901234'])(
    'recognizes a legacy signed user identifier: %s',
    (userId) => {
      expect(parseSessionToken(signCookieValue(userId).signed)).toEqual({
        valid: true,
        kind: 'legacy',
        userId,
        legacyOrigin: true,
      });
    },
  );

  it('does not reinterpret a handle-shaped legacy userId as a modern session', () => {
    expect(parseSessionToken(signCookieValue(handle).signed)).toEqual({
      valid: true,
      kind: 'legacy',
      userId: handle,
      legacyOrigin: true,
    });
    expect(parseSessionToken(signCookieValue(`s2:${handle}`).signed)).toEqual({
      valid: true,
      kind: 'modern',
      handle,
      handleHash: hashSessionHandle(handle),
    });
  });

  it.each([
    '',
    's2:',
    `s3:${handle}`,
    `s02:${handle}`,
    `S2:${handle}`,
    `s2:${handle}:extra`,
    `s2:${handle}.extra`,
    `s2:${handle}=`,
    `s2:${handle.slice(1)}`,
    `s2:${handle}A`,
    's2:' + 'B'.repeat(43),
    `s2:${handle.slice(0, -1)}+`,
    `s2:${handle.slice(0, -1)}/`,
    'user.id',
    'user:claim',
    'user id',
    'user\nid',
    'user\tid',
    'user\n',
    'user\r\n',
  ])('rejects malformed or ambiguous payloads even with a valid HMAC: %j', (payload) => {
    expect(parseSessionToken(signCookieValue(payload).signed)).toMatchObject({
      valid: false,
      reason: 'INVALID_FORMAT',
    });
  });

  it.each([null, undefined, '', 42, {}, [], 'unsigned', '.'])(
    'explicitly rejects missing or invalid external input: %j',
    (token) => {
      expect(parseSessionToken(token)).toMatchObject({
        valid: false,
        reason: 'INVALID_FORMAT',
      });
    },
  );

  it('rejects extra delimiters, whitespace and permissive hex decoding suffixes', () => {
    const { token } = createSessionToken();
    for (const malformed of [
      `.${token}`,
      `${token}.`,
      `${token}.extra`,
      `${token}\n`,
      `${token}00`,
      `${token}g`,
      `${token.slice(0, -1)}g`,
      ` ${token}`,
    ]) {
      expect(parseSessionToken(malformed)).toMatchObject({
        valid: false,
        reason: 'INVALID_FORMAT',
      });
    }
  });

  it('rejects a changed version, handle, userId or valid-length signature', () => {
    const { token } = createSessionToken();
    const [payload, signature] = token.split('.');
    const differentHandle = Buffer.alloc(32, 1).toString('base64url');
    for (const tampered of [
      `${payload.replace('s2:', '')}.${signature}`,
      `s2:${differentHandle}.${signature}`,
      `${payload}.${signature[0] === '0' ? '1' : '0'}${signature.slice(1)}`,
      signCookieValue('user-123').signed.replace('user-123', 'user-456'),
    ]) {
      expect(parseSessionToken(tampered)).toMatchObject({
        valid: false,
        reason: 'VERIFICATION_FAILED',
      });
    }
  });

  it.each([null, undefined, '', 'short', 'a'.repeat(64), 'B'.repeat(43)])(
    'refuses to hash a malformed handle: %j',
    (input) => expect(() => hashSessionHandle(input)).toThrow(CookieSigningError),
  );

  it('keeps generic signed values with dots and colons unchanged', () => {
    for (const value of ['user.name@example.com', 'purpose:claim.with.dots', `s3:${handle}`]) {
      const signed = signCookieValue(value);
      expect(verifyCookieValue(signed.signed)).toEqual({ valid: true, value });
      expect(parseSessionToken(signed.signed).valid).toBe(false);
    }
  });

  it('surfaces missing signing configuration without issuing or accepting a token', () => {
    const { token } = createSessionToken();
    vi.stubEnv('SESSION_SECRET', '');
    _resetSecretCache();
    expect(() => createSessionToken()).toThrow(CookieSigningError);
    expect(parseSessionToken(token)).toMatchObject({
      valid: false,
      reason: 'VERIFICATION_FAILED',
      error: expect.stringContaining('SESSION_SECRET'),
    });
  });

  it('rejects credentials after the signing secret changes', () => {
    const { token } = createSessionToken();
    vi.stubEnv('SESSION_SECRET', `${secret}-different`);
    _resetSecretCache();
    expect(parseSessionToken(token)).toMatchObject({
      valid: false,
      reason: 'VERIFICATION_FAILED',
    });
  });
});
