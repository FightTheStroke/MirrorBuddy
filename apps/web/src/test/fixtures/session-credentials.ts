import { createHash, createHmac, randomBytes } from 'node:crypto';
import { expect } from 'vitest';
import { signCookieValue, verifyCookieValue } from '@/lib/auth/server';

/** Detects stale signer state without reaching into the production secret cache. */
export function expectSessionSignature(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('A synthetic session secret is required');
  const separator = token.lastIndexOf('.');
  expect(separator).toBeGreaterThan(0);
  expect(token.slice(separator + 1)).toBe(
    createHmac('sha256', secret).update(token.slice(0, separator)).digest('hex'),
  );
}

/** Supplies signed input, not an authentication decision; the real reader resolves it. */
export function signedSessionCredential() {
  const handle = randomBytes(32).toString('base64url');
  const token = signCookieValue(`s2:${handle}`).signed;
  expectSessionSignature(token);
  return {
    token,
    handleHash: createHash('sha256').update(handle).digest('hex'),
  };
}

/** Independently checks the issued wire format and its persisted digest. */
export function expectNativeSessionCookie(token: string | undefined) {
  expect(token).toMatch(/^s2:[A-Za-z0-9_-]{43}\.[a-fA-F0-9]{64}$/);
  if (typeof token !== 'string') throw new Error('Missing native session cookie');
  expectSessionSignature(token);
  const verified = verifyCookieValue(token);
  expect(verified.valid).toBe(true);
  const handle = token.slice(3, token.indexOf('.'));
  expect(verified.value).toBe(`s2:${handle}`);
  expect(Buffer.from(handle, 'base64url').toString('base64url')).toBe(handle);
  return { handleHash: createHash('sha256').update(handle).digest('hex') };
}
