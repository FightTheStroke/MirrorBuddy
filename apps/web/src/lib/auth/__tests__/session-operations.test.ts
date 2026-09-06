import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  user: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  revoke: vi.fn(),
  resets: vi.fn(),
  clock: vi.fn(),
  recheck: vi.fn(),
  token: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock('../session-token', () => ({ createSessionToken: mocks.token }));
vi.mock('../session-reader', () => ({
  revalidateSession: mocks.recheck,
  resolveSessionTokenInTransaction: mocks.recheck,
}));
import {
  issuePasswordSession,
  createGuestSession,
  upgradeLegacySession,
} from '../session-issuance';
import {
  revokeSession,
  changeSessionPassword,
  resetUserPassword,
  setUserDisabled,
} from '../session-revocation';

const now = new Date('2026-09-06T00:00:00Z');
const user = {
  id: 'owner',
  authVersion: 4,
  disabled: false,
  passwordHash: 'hash',
  legacyRevoked: false,
};
const authorized = {
  status: 'AUTHENTICATED' as const,
  userId: 'owner',
  userAuthVersion: 4,
  checkedAt: now,
  validUntil: new Date(now.getTime() + 86_400_000),
  session: {
    kind: 'modern' as const,
    handleHash: 'a'.repeat(64),
    legacyOrigin: false,
    issuedAt: now,
    expiresAt: new Date(now.getTime() + 86_400_000),
  },
};
const tx = {
  $queryRaw: mocks.clock,
  user: { findUnique: mocks.user, create: mocks.user, update: mocks.update },
  authSession: { create: mocks.create, updateMany: mocks.revoke },
  passwordResetToken: { updateMany: mocks.resets },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((work) => work(tx));
  mocks.clock.mockResolvedValue([{ now }]);
  mocks.user.mockResolvedValue(user);
  mocks.update.mockResolvedValue({ ...user, authVersion: 5, legacyRevoked: true });
  mocks.create.mockImplementation(({ data }) => Promise.resolve(data));
  mocks.revoke.mockResolvedValue({ count: 1 });
  mocks.recheck.mockResolvedValue(authorized);
  mocks.token.mockReturnValue({ token: 'opaque-signed', handleHash: 'b'.repeat(64) });
});

describe('durable session operations', () => {
  it('issues password sessions for seven days, storing only the hash', async () => {
    const issued = await issuePasswordSession('owner', { passwordHash: 'hash', authVersion: 4 });
    expect(issued.token).toBe('opaque-signed');
    expect(issued.expiresAt.getTime() - now.getTime()).toBe(604_800_000);
    expect(mocks.create.mock.calls[0][0].data).not.toHaveProperty('token');
    expect(mocks.create.mock.calls[0][0].data).not.toHaveProperty('handle');
  });
  it('preserves 365-day credentialless guest issuance', async () => {
    const { issued } = await createGuestSession({});
    expect(issued.expiresAt.getTime() - now.getTime()).toBe(31_536_000_000);
  });
  it('fresh password proof replaces the presented native row without revoking other devices', async () => {
    await issuePasswordSession('owner', { passwordHash: 'hash', authVersion: 4 }, 'old-native');
    expect(mocks.revoke).toHaveBeenCalledWith({
      where: { userId: 'owner', handleHash: 'a'.repeat(64), revokedAt: null },
      data: { revokedAt: now },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('cannot issue from a stale password proof', async () => {
    await expect(
      issuePasswordSession('owner', { passwordHash: 'old', authVersion: 4 }),
    ).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rejects missing inputs and disabled owners', async () => {
    await expect(issuePasswordSession(undefined, undefined)).rejects.toThrow();
    mocks.user.mockResolvedValue({ ...user, disabled: true });
    await expect(
      issuePasswordSession('owner', { passwordHash: 'hash', authVersion: 4 }),
    ).rejects.toThrow();
  });
  it('revokes only the acting native session for current scope', async () => {
    await revokeSession(authorized, 'current');
    expect(mocks.revoke).toHaveBeenCalledWith({
      where: { userId: 'owner', handleHash: 'a'.repeat(64), revokedAt: null },
      data: { revokedAt: now },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('revokes legacy family without changing the independent native version', async () => {
    const legacy = {
      ...authorized,
      session: { kind: 'legacy' as const, legacyOrigin: true as const },
    };
    mocks.recheck.mockResolvedValue(legacy);
    await revokeSession(legacy, 'current');
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'owner' },
      data: { legacyRevoked: true },
    });
    expect(mocks.revoke).toHaveBeenCalledWith({
      where: { userId: 'owner', legacyOrigin: true, revokedAt: null },
      data: { revokedAt: now },
    });
  });
  it('globally increments the version and blocks legacy in the same update', async () => {
    await revokeSession(authorized, 'all');
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'owner' },
      data: { authVersion: { increment: 1 }, legacyRevoked: true },
    });
  });
  it('password change replaces the acting session at the new version', async () => {
    await changeSessionPassword(authorized, 'hash', 'new-hash');
    expect(mocks.create.mock.calls[0][0].data.authVersion).toBe(5);
    expect(mocks.resets).toHaveBeenCalled();
  });
  it('password reset issues nothing; disable also invalidates prior access', async () => {
    await resetUserPassword('owner', 'new-hash', true);
    await setUserDisabled('owner', true);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls[1][0].data).toMatchObject({
      disabled: true,
      authVersion: { increment: 1 },
      legacyRevoked: true,
    });
  });
  it('rejects a revoked administrative actor before resetting another account', async () => {
    mocks.recheck.mockResolvedValue({ status: 'DENIED', reason: 'SESSION_REVOKED' });
    await expect(resetUserPassword('target', 'new-hash', true, authorized)).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('never performs bearer-only native sliding renewal', async () => {
    expect(await upgradeLegacySession(authorized)).toEqual({ upgraded: false });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('caps legacy upgrades at the original activation deadline', async () => {
    const legacy = {
      ...authorized,
      session: { kind: 'legacy' as const, legacyOrigin: true as const },
    };
    mocks.recheck.mockResolvedValue(legacy);
    const upgraded = await upgradeLegacySession(legacy);
    expect(upgraded.upgraded).toBe(true);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      legacyOrigin: true,
      expiresAt: authorized.validUntil,
    });
  });
  it('surfaces transaction failure without issuing a success-shaped result', async () => {
    mocks.transaction.mockRejectedValue(new Error('database unavailable'));
    await expect(revokeSession(authorized, 'current')).rejects.toThrow('database unavailable');
  });
});
