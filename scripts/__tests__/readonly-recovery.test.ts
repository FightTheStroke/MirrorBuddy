// @vitest-environment node
import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recoverReadonlyAccount, recoveryAction } from '../lib/seed-admin-recovery';

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), invalidate: vi.fn() }));
vi.mock('../../apps/web/src/lib/auth/session-transaction', () => ({
  sessionTransaction: mocks.transaction,
  sessionDatabaseNow: async () => new Date('2026-09-15'),
}));
vi.mock('../../apps/web/src/lib/auth/session-revocation', () => ({
  invalidateAllSessions: mocks.invalidate,
}));
const hash = (email: string) => createHash('sha256').update(email).digest('hex');
const env = {
  NODE_ENV: 'production',
  ADMIN_EMAIL: 'owner@example.test',
  ADMIN_PASSWORD: 'owner-password',
  ADMIN_READONLY_EMAIL: 'readonly@example.test',
} satisfies NodeJS.ProcessEnv;
let owner: Record<string, unknown>;
let readonly: Record<string, unknown>;
const tx = {
  user: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
  passwordResetToken: { updateMany: vi.fn() },
};
beforeEach(async () => {
  vi.clearAllMocks();
  owner = {
    id: 'owner',
    emailHash: hash(env.ADMIN_EMAIL),
    role: 'ADMIN',
    disabled: false,
    mustChangePassword: false,
    passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 4),
    authVersion: 2,
  };
  readonly = {
    ...owner,
    id: 'readonly',
    emailHash: hash(env.ADMIN_READONLY_EMAIL),
    role: 'ADMIN_READONLY',
    mustChangePassword: true,
  };
  tx.user.findMany.mockImplementation(async ({ where }) =>
    where.OR[0].emailHash === owner.emailHash ? [owner] : [readonly],
  );
  tx.$queryRaw.mockImplementation(async (_sql, id) => [{ id }]);
  mocks.transaction.mockImplementation(async (work) => work(tx));
});
describe('existing-only readonly recovery', () => {
  it('defaults to a report and requires the exact conversion confirmation', () => {
    expect(recoveryAction([])).toBe('report');
    expect(recoveryAction(['report'])).toBe('report');
    expect(recoveryAction(['convert', 'CONVERT_READONLY'])).toBe('convert');
    for (const args of [null, ['convert'], ['convert', 'yes'], ['report', 'extra']])
      expect(() => recoveryAction(args)).toThrow();
  });
  it('reports eligible bcrypt without writing any account or session', async () => {
    expect(await recoverReadonlyAccount('report', env)).toBe('CONVERSION_REQUIRED');
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(tx.passwordResetToken.updateMany).not.toHaveBeenCalled();
  });
  it('converts only the readonly through the shared revoking seed process', async () => {
    const previousOwner = { ...owner };
    expect(await recoverReadonlyAccount('convert', env)).toBe('CONVERTED');
    expect(mocks.invalidate).toHaveBeenCalledExactlyOnceWith(tx, 'readonly', expect.any(Date), {
      passwordHash: '!seed-admin:readonly:no-password',
      mustChangePassword: true,
    });
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 'readonly', used: false },
      data: { used: true },
    });
    expect(owner).toEqual(previousOwner);
  });
  it('is a no-op when the canonical marker already exists', async () => {
    readonly.passwordHash = '!seed-admin:readonly:no-password';
    expect(await recoverReadonlyAccount('convert', env)).toBe('ALREADY_READY');
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it.each([
    ['role', 'USER'],
    ['disabled', true],
    ['emailHash', null],
    ['emailHash', 'wrong'],
    ['passwordHash', null],
    ['passwordHash', 'invalid'],
    ['authVersion', null],
  ])('rejects readonly %s=%j before a write', async (key, value) => {
    readonly[key] = value;
    await expect(recoverReadonlyAccount('convert', env)).rejects.toThrow();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it.each([
    ['role', 'USER'],
    ['disabled', true],
    ['mustChangePassword', true],
    ['passwordHash', null],
    ['emailHash', null],
  ])('rejects changed owner %s=%j', async (key, value) => {
    owner[key] = value;
    await expect(recoverReadonlyAccount('convert', env)).rejects.toThrow();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it('rejects an unverified owner password', async () => {
    await expect(
      recoverReadonlyAccount('convert', { ...env, ADMIN_PASSWORD: 'wrong-secret' }),
    ).rejects.toThrow();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it.each(
    [[], [null], [undefined], [{ id: 'other' }, { id: 'readonly' }]].map((matches) => ({
      matches,
    })),
  )('rejects absent, invalid or ambiguous accounts', async ({ matches }) => {
    tx.user.findMany.mockResolvedValue(matches);
    await expect(recoverReadonlyAccount('convert', env)).rejects.toThrow();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it('rejects a changed account after row locking', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(recoverReadonlyAccount('convert', env)).rejects.toThrow();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
