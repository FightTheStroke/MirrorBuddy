import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as sharedCompat from '@/test/fixtures/session-compat';
import * as sharedLifecycle from '@/test/fixtures/session-lifecycle';
import {
  signedSessionCredential,
  expectNativeSessionCookie,
} from '@/test/fixtures/session-credentials';
import * as compat from './session-compat-fixtures';
import * as lifecycle from './session-lifecycle-fixtures';
import { createSessionToken, hashSessionHandle, parseSessionToken } from '../session-token';
import { _resetSecretCache } from '../cookie-signing';

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'synthetic-shared-fixture-secret-at-least-32-characters');
  _resetSecretCache();
});
afterEach(() => {
  vi.unstubAllEnvs();
  _resetSecretCache();
});

describe('canonical shared session fixtures', () => {
  it('keeps legacy in-module fixture exports identical, including dates and functions', () => {
    expect(Object.keys(compat).sort()).toEqual(Object.keys(sharedCompat).sort());
    expect(Object.keys(lifecycle).sort()).toEqual(Object.keys(sharedLifecycle).sort());
    for (const key of Object.keys(compat) as Array<keyof typeof compat>) {
      expect(compat[key]).toBe(sharedCompat[key]);
    }
    for (const key of Object.keys(lifecycle) as Array<keyof typeof lifecycle>) {
      expect(lifecycle[key]).toBe(sharedLifecycle[key]);
    }
    expect(sharedLifecycle.modernCredential.handleHash).toBe(
      hashSessionHandle(sharedLifecycle.handle),
    );
  });

  it('supplies unique native credentials that the real session parser accepts', () => {
    const first = signedSessionCredential();
    const second = signedSessionCredential();
    expect(first.token).not.toBe(second.token);
    expect(first.handleHash).not.toBe(second.handleHash);
    for (const issued of [first, second]) {
      expect(parseSessionToken(issued.token)).toMatchObject({
        valid: true,
        kind: 'modern',
        handleHash: issued.handleHash,
      });
    }
  });

  it('ties native input to the requested user and session row without activating legacy', () => {
    const issued = sharedCompat.nativeSessionFixture('fixture-owner');
    expect(issued.row).toMatchObject({
      userId: 'fixture-owner',
      sessionUserId: 'fixture-owner',
      handleHash: issued.handleHash,
      activationId: null,
      sessionActivatedAt: null,
      legacyOrigin: false,
    });
    expect(parseSessionToken(issued.token)).toMatchObject({
      valid: true,
      kind: 'modern',
      handleHash: issued.row.handleHash,
    });
  });

  it('independently checks the real issuer token and rejects tampering', () => {
    const issued = createSessionToken();
    expect(expectNativeSessionCookie(issued.token)).toEqual({ handleHash: issued.handleHash });
    const tampered = `${issued.token.slice(0, -1)}${issued.token.endsWith('0') ? '1' : '0'}`;
    expect(() => expectNativeSessionCookie(tampered)).toThrow();
    expect(parseSessionToken(tampered).valid).toBe(false);
    expect(() => expectNativeSessionCookie(undefined)).toThrow();
  });

  it('fails on stale cached signing secrets rather than silently supplying an invalid fixture', () => {
    const issued = signedSessionCredential();
    vi.stubEnv('SESSION_SECRET', 'different-synthetic-session-secret-at-least-32-characters');
    expect(() => signedSessionCredential()).toThrow();
    expect(() => expectNativeSessionCookie(issued.token)).toThrow();
  });
});
