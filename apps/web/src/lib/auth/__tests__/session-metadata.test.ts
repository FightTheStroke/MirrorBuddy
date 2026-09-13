import { describe, expect, it } from 'vitest';
import { evaluateSessionPolicy, SessionReadError } from '../session-policy';
import { activatedAt, modernCredential, snapshot } from './session-lifecycle-fixtures';

describe('session database metadata boundaries', () => {
  it.each([null, undefined])('rejects missing verified credentials: %j', (credential) => {
    expect(evaluateSessionPolicy(credential, snapshot())).toEqual({
      status: 'DENIED',
      reason: 'INVALID_TOKEN',
    });
  });

  it.each([null, undefined, {}, [], 'invalid'])('surfaces invalid snapshots: %j', (row) => {
    expect(() => evaluateSessionPolicy(modernCredential, row)).toThrow(SessionReadError);
  });

  it.each([
    { dbNow: null },
    { dbNow: undefined },
    { dbNow: new Date(NaN) },
    { issuedAt: null },
    { issuedAt: undefined },
    { expiresAt: null },
    { expiresAt: new Date(NaN) },
    { revokedAt: '2026-01-01' },
    { userDisabled: null },
    { userDisabled: 'false' },
    { legacyOrigin: null },
    { userLegacyRevoked: null },
    { userAuthVersion: -1 },
    { sessionAuthVersion: 1.5 },
    { sessionAuthVersion: null },
    { userAuthVersion: '4' },
    { userAuthVersion: 2 ** 32 },
    { sessionUserId: 'different-owner' },
    { handleHash: 'f'.repeat(64) },
    { activationId: null, sessionActivatedAt: activatedAt },
    { activationId: 'other' },
    { sessionActivatedAt: new Date(NaN) },
    { sessionActivatedAt: undefined },
    { issuedAt: new Date('2026-03-01') },
  ])('surfaces malformed database metadata: %j', (overrides) => {
    expect(() => evaluateSessionPolicy(modernCredential, snapshot(overrides))).toThrow(
      SessionReadError,
    );
  });
});
