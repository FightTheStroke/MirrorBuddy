import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createSessionToken, parseSessionToken } from '../session-token';
import { _resetSecretCache } from '../cookie-signing';
import { issueTestSession, testSessionCookies } from '../../../../e2e/helpers/durable-session';
import { createFixtureToken } from '../../../../e2e/helpers/session-token-factory';
import { requireNativeFixtureCookie } from '../../../../e2e/helpers/session-cookie-format';

vi.mock('../../../../e2e/helpers/session-token-factory', () => ({ createFixtureToken: vi.fn() }));
const user = vi.fn();
const query = vi.fn();
const create = vi.fn();
const tx = { user: { findUnique: user }, $queryRaw: query, authSession: { create } };
const transaction = vi.fn(async (work: (value: typeof tx) => Promise<unknown>) => work(tx));
const prisma = { $transaction: transaction } as unknown as PrismaClient;
const now = new Date('2026-09-06T00:00:00Z');
const owner = { id: 'fixture-owner', authVersion: 7, disabled: false, isTestData: true };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SESSION_SECRET', 'e2e-test-session-secret-32-characters-min');
  _resetSecretCache();
  user.mockResolvedValue(owner);
  query.mockResolvedValue([{ now }]);
  transaction.mockImplementation(async (work) => work(tx));
  vi.mocked(createFixtureToken).mockImplementation(async () => createSessionToken());
});
afterEach(() => {
  vi.unstubAllEnvs();
  _resetSecretCache();
});

describe('durable E2E session fixture', () => {
  it('persists a hashed native handle and binds the owner/version/DB-clock/24h lifetime', async () => {
    const issued = await issueTestSession(prisma, 'fixture-owner');
    expect(parseSessionToken(issued.token)).toMatchObject({ valid: true, kind: 'modern' });
    expect(() => requireNativeFixtureCookie(issued.token)).not.toThrow();
    expect(create).toHaveBeenCalledWith({
      data: {
        handleHash: issued.handleHash,
        userId: 'fixture-owner',
        authVersion: 7,
        issuedAt: now,
        expiresAt: new Date('2026-09-07T00:00:00Z'),
        legacyOrigin: false,
      },
    });
    expect(JSON.stringify(create.mock.calls)).not.toContain(issued.token);
    expect(testSessionCookies(issued)[0]).toMatchObject({
      value: issued.token,
      httpOnly: true,
      expires: issued.expiresAt.getTime() / 1000,
    });
    expect(testSessionCookies(issued)[1].value).toBe('fixture-owner');
  });
  it.each([undefined, null, '', 'owner', `owner.${'a'.repeat(64)}`])(
    'requires native externally provisioned credentials, never a legacy fallback: %j',
    (cookie) => {
      expect(() => requireNativeFixtureCookie(cookie)).toThrow();
    },
  );
  it.each([
    null,
    undefined,
    { id: 'other-owner' },
    { disabled: true },
    { authVersion: '7' },
    { authVersion: 1.5 },
    { authVersion: -1 },
    { authVersion: 2147483648 },
    { isTestData: false },
  ])('never mints a fake identity for an invalid owner: %j', async (invalid) => {
    user.mockResolvedValue(invalid ? { ...owner, ...invalid } : invalid);
    await expect(issueTestSession(prisma, 'fixture-owner')).rejects.toThrow();
    expect(createFixtureToken).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it.each([{ rows: [] }, { rows: [{ now: null }] }, { rows: [{ now: '2026-09-06' }] }])(
    'never substitutes process time for invalid DB time: %j',
    async ({ rows }) => {
      query.mockResolvedValue(rows);
      await expect(issueTestSession(prisma, 'fixture-owner')).rejects.toThrow();
      expect(createFixtureToken).not.toHaveBeenCalled();
    },
  );
  it('propagates session insertion failure without returning a cookie', async () => {
    create.mockRejectedValue(new Error('DB failure'));
    await expect(issueTestSession(prisma, 'fixture-owner')).rejects.toThrow('DB failure');
  });
  it('never returns a minted token when the database transaction cannot commit', async () => {
    transaction.mockImplementation(async (work) => {
      await work(tx);
      throw new Error('commit failed');
    });
    await expect(issueTestSession(prisma, 'fixture-owner')).rejects.toThrow('commit failed');
  });
  it('propagates owner lookup failure before token generation', async () => {
    user.mockRejectedValue(new Error('database unavailable'));
    await expect(issueTestSession(prisma, 'fixture-owner')).rejects.toThrow('database unavailable');
    expect(createFixtureToken).not.toHaveBeenCalled();
  });
  it.each([0, -1, 86401, Number.NaN])(
    'rejects unbounded/invalid lifetimes: %j',
    async (lifetime) => {
      await expect(issueTestSession(prisma, 'fixture-owner', lifetime)).rejects.toThrow();
      expect(transaction).not.toHaveBeenCalled();
    },
  );
});
