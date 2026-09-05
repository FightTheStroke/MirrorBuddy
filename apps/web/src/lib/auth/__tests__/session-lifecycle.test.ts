import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSessionActivation } from '../activation';
import { evaluateSessionPolicy, SessionReadError } from '../session-policy';
import {
  activatedAt,
  dbNow,
  deadline,
  legacyCredential,
  legacySnapshot,
  modernCredential,
  snapshot,
} from './session-lifecycle-fixtures';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('standalone session lifecycle policy', () => {
  it('authorizes a native session using its owner and durable bounds only', () => {
    const result = evaluateSessionPolicy(
      modernCredential,
      snapshot({
        activationId: null,
        sessionActivatedAt: null,
        userLegacyRevoked: true,
      }),
    );
    expect(result).toMatchObject({
      status: 'AUTHENTICATED',
      userId: 'session-owner',
      userAuthVersion: 4,
      checkedAt: dbNow,
      session: { kind: 'modern', handleHash: modernCredential.handleHash, legacyOrigin: false },
      validUntil: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('handle');
  });

  it.each([
    [{ revokedAt: dbNow }, 'SESSION_REVOKED'],
    [{ userDisabled: true }, 'USER_DISABLED'],
    [{ sessionAuthVersion: 3 }, 'VERSION_MISMATCH'],
    [{ issuedAt: new Date(dbNow.getTime() + 1) }, 'SESSION_NOT_YET_VALID'],
    [{ expiresAt: dbNow }, 'SESSION_EXPIRED'],
    [{ expiresAt: new Date(dbNow.getTime() - 1) }, 'SESSION_EXPIRED'],
    [{ legacyOrigin: true, userLegacyRevoked: true }, 'LEGACY_REVOKED'],
  ])('denies invalid session state without exposing identity: %j', (overrides, reason) => {
    expect(evaluateSessionPolicy(modernCredential, snapshot(overrides))).toEqual({
      status: 'DENIED',
      reason,
    });
  });

  it('accepts exact issuedAt and the instant immediately before expiry', () => {
    expect(
      evaluateSessionPolicy(
        modernCredential,
        snapshot({
          issuedAt: dbNow,
          expiresAt: new Date(dbNow.getTime() + 1),
        }),
      ).status,
    ).toBe('AUTHENTICATED');
  });

  it('rejects a missing session and does not confuse it with a legacy credential', () => {
    expect(evaluateSessionPolicy(modernCredential, legacySnapshot())).toEqual({
      status: 'DENIED',
      reason: 'SESSION_NOT_FOUND',
    });
  });

  it.each([modernCredential, legacyCredential])(
    'rejects a deleted or absent owner',
    (credential) => {
      const row = credential.kind === 'modern' ? snapshot() : legacySnapshot();
      expect(
        evaluateSessionPolicy(credential, {
          ...row,
          userId: null,
          userDisabled: null,
          userAuthVersion: null,
          userLegacyRevoked: null,
        }),
      ).toEqual({ status: 'DENIED', reason: 'USER_NOT_FOUND' });
    },
  );

  it('current-session revocation does not revoke an independently valid device', () => {
    expect(evaluateSessionPolicy(modernCredential, snapshot({ revokedAt: dbNow })).status).toBe(
      'DENIED',
    );
    expect(evaluateSessionPolicy(modernCredential, snapshot()).status).toBe('AUTHENTICATED');
  });

  it('raw legacy has no invented issuance time or counter claim', () => {
    const result = evaluateSessionPolicy(legacyCredential, legacySnapshot({ userAuthVersion: 12 }));
    expect(result).toEqual({
      status: 'AUTHENTICATED',
      userId: 'session-owner',
      userAuthVersion: 12,
      checkedAt: dbNow,
      validUntil: deadline,
      session: { kind: 'legacy', legacyOrigin: true },
    });
    expect(result).not.toHaveProperty('issuedAt');
  });

  it.each([false, true])('enforces exact legacy deadline (modern envelope: %s)', (modern) => {
    const credential = modern ? modernCredential : legacyCredential;
    const row = modern ? snapshot({ legacyOrigin: true }) : legacySnapshot();
    expect(
      evaluateSessionPolicy(credential, {
        ...row,
        dbNow: new Date(deadline.getTime() - 1),
      }).status,
    ).toBe('AUTHENTICATED');
    for (const instant of [deadline, new Date(deadline.getTime() + 1)]) {
      expect(evaluateSessionPolicy(credential, { ...row, dbNow: instant })).toEqual({
        status: 'DENIED',
        reason: 'LEGACY_EXPIRED',
      });
    }
  });

  it('caps upgraded legacy sessions at the earlier of durable expiry and the deadline', () => {
    expect(evaluateSessionPolicy(modernCredential, snapshot({ legacyOrigin: true }))).toMatchObject(
      { status: 'AUTHENTICATED', validUntil: deadline },
    );
    const earlier = new Date(dbNow.getTime() + 60_000);
    expect(
      evaluateSessionPolicy(modernCredential, snapshot({ legacyOrigin: true, expiresAt: earlier })),
    ).toMatchObject({ status: 'AUTHENTICATED', validUntil: earlier });
  });

  it.each([false, true])(
    'missing activation is NOT_ACTIVATED, never authorized (modern: %s)',
    (modern) => {
      const credential = modern ? modernCredential : legacyCredential;
      const row = modern ? snapshot({ legacyOrigin: true }) : legacySnapshot();
      for (const activationId of [null, 'global']) {
        expect(
          evaluateSessionPolicy(credential, {
            ...row,
            activationId,
            sessionActivatedAt: null,
          }),
        ).toEqual({ status: 'NOT_ACTIVATED' });
      }
    },
  );

  it.each([false, true])(
    'activation absence never bypasses family revocation (modern: %s)',
    (modern) => {
      const row = modern ? snapshot({ legacyOrigin: true }) : legacySnapshot();
      expect(
        evaluateSessionPolicy(modern ? modernCredential : legacyCredential, {
          ...row,
          activationId: null,
          sessionActivatedAt: null,
          userLegacyRevoked: true,
        }),
      ).toEqual({ status: 'DENIED', reason: 'LEGACY_REVOKED' });
    },
  );

  it('disabled, revoked and version-mismatched sessions remain denied without activation', () => {
    for (const overrides of [
      { userDisabled: true },
      { revokedAt: dbNow },
      { sessionAuthVersion: 0 },
    ]) {
      expect(
        evaluateSessionPolicy(
          modernCredential,
          snapshot({
            ...overrides,
            legacyOrigin: true,
            activationId: null,
            sessionActivatedAt: null,
          }),
        ).status,
      ).toBe('DENIED');
    }
  });

  it('native sessions do not inherit the legacy deadline', () => {
    expect(
      evaluateSessionPolicy(
        modernCredential,
        snapshot({
          dbNow: new Date(deadline.getTime() + 1),
        }),
      ).status,
    ).toBe('AUTHENTICATED');
  });

  it('process restarts, client clocks and environment flags cannot change policy', async () => {
    const expected = evaluateSessionPolicy(legacyCredential, legacySnapshot());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01'));
    vi.stubEnv('E2E_TESTS', '1');
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const restarted = await import('../session-policy');
    expect(restarted.evaluateSessionPolicy(legacyCredential, legacySnapshot())).toEqual(expected);
    expect(
      restarted.evaluateSessionPolicy(
        modernCredential,
        snapshot({
          revokedAt: dbNow,
          userDisabled: true,
        }),
      ).status,
    ).toBe('DENIED');
  });

  it('rejects a future legacy activation timestamp as invalid database state', () => {
    expect(() =>
      evaluateSessionPolicy(
        legacyCredential,
        legacySnapshot({
          sessionActivatedAt: new Date(dbNow.getTime() + 1),
        }),
      ),
    ).toThrow(SessionReadError);
  });

  it.each([null, undefined])('missing activation input is explicit: %j', (value) => {
    expect(getSessionActivation(value)).toEqual({ status: 'NOT_ACTIVATED' });
  });

  it.each(['2026-01-01', 0, {}, new Date(NaN), new Date(8_640_000_000_000_000)])(
    'invalid activation never becomes a timestamp: %j',
    (value) => {
      expect(getSessionActivation(value)).toEqual({ status: 'INVALID_ACTIVATION' });
    },
  );

  it('derives exactly 604800 seconds from the stored instant', () => {
    expect(getSessionActivation(activatedAt)).toEqual({
      status: 'ACTIVATED',
      activatedAt,
      legacyDeadline: deadline,
    });
  });
});
