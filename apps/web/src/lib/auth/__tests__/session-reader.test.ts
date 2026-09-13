import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: query } }));

import { _resetSecretCache, signCookieValue } from '../cookie-signing';
import { createSessionToken } from '../session-token';
import { resolveSessionToken } from '../session-reader';
import { snapshot, legacySnapshot } from './session-lifecycle-fixtures';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SESSION_SECRET', 'synthetic-session-reader-secret-at-least-32-characters');
  _resetSecretCache();
});
afterEach(() => {
  vi.unstubAllEnvs();
  _resetSecretCache();
});

describe('standalone database-backed session reader', () => {
  it('performs a fresh, parameterized, database-clock read for every valid token', async () => {
    const issued = createSessionToken();
    query.mockResolvedValue([snapshot({ handleHash: issued.handleHash })]);
    const result = await resolveSessionToken(issued.token);
    expect(result).toMatchObject({ status: 'AUTHENTICATED', userId: 'session-owner' });
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0][0].join('');
    expect(sql).toContain('statement_timestamp()');
    expect(sql).toContain('"AuthSession"');
    expect(sql).toContain('"User"');
    expect(sql).toContain('"GlobalConfig"');
    expect(sql).not.toMatch(/\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
    expect(query.mock.calls[0].slice(1)).toContain(issued.handleHash);
    expect(query.mock.calls[0].slice(1)).not.toContain(issued.token);

    query.mockResolvedValue([snapshot({ handleHash: issued.handleHash, revokedAt: new Date() })]);
    expect(await resolveSessionToken(issued.token)).toEqual({
      status: 'DENIED',
      reason: 'SESSION_REVOKED',
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('raw legacy requires stored activation rather than a silent new-policy fallback', async () => {
    const token = signCookieValue('session-owner').signed;
    query.mockResolvedValue([legacySnapshot({ activationId: null, sessionActivatedAt: null })]);
    expect(await resolveSessionToken(token)).toEqual({ status: 'NOT_ACTIVATED' });
    query.mockResolvedValue([legacySnapshot()]);
    expect(await resolveSessionToken(token)).toMatchObject({
      status: 'AUTHENTICATED',
      userId: 'session-owner',
      session: { kind: 'legacy' },
    });
  });

  it.each([null, undefined, '', {}, 'unsigned', 's2:invalid.signature'])(
    'invalid input never causes a DB lookup or anonymous/legacy fallback: %j',
    async (value) => {
      expect(await resolveSessionToken(value)).toEqual({
        status: 'DENIED',
        reason: 'INVALID_TOKEN',
      });
      expect(query).not.toHaveBeenCalled();
    },
  );

  it('a valid signature with no durable record is denied, never used as a userId', async () => {
    const issued = createSessionToken();
    query.mockResolvedValue([
      legacySnapshot({
        userId: null,
        userDisabled: null,
        userAuthVersion: null,
        userLegacyRevoked: null,
      }),
    ]);
    expect(await resolveSessionToken(issued.token)).toEqual({
      status: 'DENIED',
      reason: 'SESSION_NOT_FOUND',
    });
  });

  it.each([null, undefined, [], [{}], [null], [{}, {}]])(
    'surfaces malformed DB response envelopes: %j',
    async (rows) => {
      query.mockResolvedValue(rows);
      await expect(resolveSessionToken(createSessionToken().token)).rejects.toMatchObject({
        name: 'SessionReadError',
        code: 'INVALID_DATABASE_STATE',
      });
    },
  );

  it.each([
    new Error('connection refused'),
    Object.assign(new Error('relation AuthSession does not exist'), { code: 'P2021' }),
    Object.assign(new Error('column sessionActivatedAt does not exist'), { code: 'P2022' }),
    null,
    undefined,
  ])(
    'DB and missing-schema failures never turn into authorization or anonymous state',
    async (cause) => {
      query.mockRejectedValue(cause);
      await expect(resolveSessionToken(createSessionToken().token)).rejects.toMatchObject({
        name: 'SessionReadError',
        code: 'DATABASE_FAILURE',
      });
    },
  );
});
