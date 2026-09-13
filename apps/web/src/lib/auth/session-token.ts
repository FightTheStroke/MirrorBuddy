import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { CookieSigningError, signCookieValue, verifyCookieValue } from '@/lib/auth/cookie-signing';

export type SessionTokenResult =
  | { valid: true; kind: 'modern'; handle: string; handleHash: string }
  | { valid: true; kind: 'legacy'; userId: string; legacyOrigin: true }
  | {
      valid: false;
      reason: 'INVALID_FORMAT' | 'VERIFICATION_FAILED';
      error: string;
    };

export interface CreatedSessionToken {
  readonly token: string;
  readonly handleHash: string;
}

function isSessionHandle(handle: unknown): handle is string {
  return (
    typeof handle === 'string' &&
    handle.length === 43 &&
    /^[A-Za-z0-9_-]{43}$/.test(handle) &&
    Buffer.from(handle, 'base64url').toString('base64url') === handle
  );
}

/** Persist only this digest, never the handle or the signed token. */
export function hashSessionHandle(handle: unknown): string {
  if (!isSessionHandle(handle)) {
    throw new CookieSigningError('Invalid session handle format', 'INVALID_FORMAT');
  }
  return createHash('sha256').update(handle).digest('hex');
}

/** Foundation only: callers must persist the session before emitting its token. */
export function createSessionToken(): CreatedSessionToken {
  const handle = randomBytes(32).toString('base64url');
  return {
    token: signCookieValue(`s2:${handle}`).signed,
    handleHash: hashSessionHandle(handle),
  };
}

/**
 * Verifies the envelope, NOT authentication. Modern identity, lifetime and origin
 * must be resolved from AuthSession; legacy admission requires the rollout policy.
 */
export function parseSessionToken(token: unknown): SessionTokenResult {
  const invalidFormat = {
    valid: false,
    reason: 'INVALID_FORMAT',
    error: 'Invalid session token format',
  } as const;
  if (typeof token !== 'string') return invalidFormat;

  // Unlike the generic signer, authentication never accepts embedded delimiters.
  const parts = token.split('.');
  if (parts.length !== 2) return invalidFormat;
  const [payload, signature] = parts;
  if (!payload || !/^[0-9a-fA-F]{64}$/.test(signature) || signature.length !== 64) {
    return invalidFormat;
  }

  const modern = payload.startsWith('s2:');
  const handle = modern ? payload.slice(3) : undefined;
  if (modern ? !isSessionHandle(handle) : /[^A-Za-z0-9_-]/.test(payload)) {
    return invalidFormat;
  }

  const verified = verifyCookieValue(token);
  if (!verified.valid || verified.value !== payload) {
    return {
      valid: false,
      reason: 'VERIFICATION_FAILED',
      error: verified.error ?? 'Session signature verification failed',
    };
  }

  if (isSessionHandle(handle)) {
    return { valid: true, kind: 'modern', handle, handleHash: hashSessionHandle(handle) };
  }
  return { valid: true, kind: 'legacy', userId: payload, legacyOrigin: true };
}
