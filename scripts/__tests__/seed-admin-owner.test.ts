// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { disabledPassword, now, readonlyEmail, seedFixture } from './seed-admin-readonly-fixtures';

const mocks = vi.hoisted(() => ({
  user: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  transaction: vi.fn(),
  query: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock('../../apps/web/src/lib/db', () => ({
  prisma: {
    user: mocks.user,
    $transaction: mocks.transaction,
    $queryRaw: mocks.query,
    $disconnect: mocks.disconnect,
  },
}));
const password = 'synthetic-owner-password';
let fixture = seedFixture();
let previousExit: typeof process.exitCode;

function owner() {
  const account = fixture.accounts.get('admin-owner');
  if (!account) throw new Error('Owner fixture missing');
  return account;
}
async function attach(userId = 'admin-owner') {
  const account = fixture.accounts.get(userId);
  if (!account) throw new Error('Session owner fixture missing');
  const { createSessionToken } = await import('../../apps/web/src/lib/auth/session-token');
  const { resolveSessionToken } = await import('../../apps/web/src/lib/auth/session-reader');
  const issued = createSessionToken();
  fixture.sessions.set(issued.handleHash, {
    userId,
    authVersion: account.authVersion,
    revokedAt: null,
  });
  return { handleHash: issued.handleHash, resolve: () => resolveSessionToken(issued.token) };
}
async function runSeed(success = true) {
  const before = mocks.disconnect.mock.calls.length;
  vi.resetModules();
  await import('../seed-admin');
  await vi.waitFor(() => {
    expect(mocks.disconnect).toHaveBeenCalledTimes(before + 1);
    if (!success) expect(process.exitCode).toBe(1);
  });
  if (success) {
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  } else {
    expect(console.error).toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('synchronized'));
  }
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  previousExit = process.exitCode;
  process.exitCode = undefined;
  fixture = seedFixture();
  owner().passwordHash = await bcrypt.hash(password, 4);
  vi.stubEnv('ADMIN_EMAIL', 'admin@example.test');
  vi.stubEnv('ADMIN_PASSWORD', password);
  vi.stubEnv('ADMIN_READONLY_EMAIL', '');
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('E2E_TESTS', '');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('SESSION_SECRET', 'synthetic-owner-seed-session-secret-at-least-32');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.user.findMany.mockImplementation(fixture.user.findMany);
  mocks.user.create.mockImplementation(fixture.user.create);
  mocks.user.update.mockImplementation(fixture.user.update);
  mocks.query.mockImplementation(fixture.query);
  mocks.transaction.mockImplementation((work: (tx: typeof fixture.tx) => Promise<unknown>) =>
    work(fixture.tx),
  );
});
afterEach(() => {
  process.exitCode = previousExit;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('owner reconciliation preserves only proven unchanged safe credentials', () => {
  it('preserves bcrypt, version and all native sessions across repeated equal-password runs', async () => {
    const hash = owner().passwordHash;
    const first = await attach(),
      second = await attach();
    await runSeed();
    await runSeed();
    expect(owner().authVersion).toBe(2);
    expect(owner().legacyRevoked).toBe(false);
    expect(owner().passwordHash === hash).toBe(true);
    expect(fixture.resetUsed.has(owner().id)).toBe(false);
    expect(await first.resolve()).toMatchObject({ status: 'AUTHENTICATED' });
    expect(await second.resolve()).toMatchObject({ status: 'AUTHENTICATED' });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it.each([
    { passwordHash: null },
    { passwordHash: '' },
    { passwordHash: 'invalid-hash' },
    { role: 'USER' },
    { role: 'ADMIN_READONLY' },
    { disabled: true },
    { mustChangePassword: true },
  ])('revokes before reconciling changed or unsafe state %#', async (change) => {
    Object.assign(owner(), change);
    const session = await attach();
    await runSeed();
    expect(owner()).toMatchObject({
      role: 'ADMIN',
      disabled: false,
      mustChangePassword: false,
      authVersion: 3,
      legacyRevoked: true,
    });
    expect(fixture.sessions.get(session.handleHash)?.revokedAt).toEqual(now);
    expect(fixture.resetUsed.get(owner().id)).toBe(true);
    expect(await session.resolve()).toMatchObject({ status: 'DENIED' });
  });

  it('revokes a real changed password once, then preserves the replacement on the next run', async () => {
    owner().passwordHash = await bcrypt.hash('different-owner-password', 4);
    const session = await attach();
    await runSeed();
    expect(owner().authVersion).toBe(3);
    expect(await session.resolve()).toMatchObject({ status: 'DENIED' });
    const replacement = await attach();
    await runSeed();
    expect(owner().authVersion).toBe(3);
    expect(await replacement.resolve()).toMatchObject({ status: 'AUTHENTICATED' });
  });

  it.each([
    { passwordHash: 'concurrent-credential' },
    { role: 'USER' },
    { disabled: true },
    { authVersion: 3 },
    { legacyRevoked: true },
    { mustChangePassword: true },
    { updatedAt: new Date(now.getTime() + 1) },
  ])('fails without overwriting a concurrent credential/account change %#', async (change) => {
    mocks.transaction.mockImplementationOnce(
      async (work: (tx: typeof fixture.tx) => Promise<unknown>) => {
        Object.assign(owner(), change);
        return work(fixture.tx);
      },
    );
    await runSeed(false);
    expect(owner()).toMatchObject(change);
    expect(fixture.resetUsed.size).toBe(0);
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it('rejects a newly ambiguous identity instead of synchronizing the earlier match', async () => {
    mocks.transaction.mockImplementationOnce(
      async (work: (tx: typeof fixture.tx) => Promise<unknown>) => {
        fixture.accounts.set('conflicting-owner', { ...owner(), id: 'conflicting-owner' });
        return work(fixture.tx);
      },
    );
    await runSeed(false);
    expect(owner().authVersion).toBe(2);
    expect(fixture.resetUsed.size).toBe(0);
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
  it('does not overwrite a racing credential when the configured password needs a reset', async () => {
    owner().passwordHash = await bcrypt.hash('previous-configuration', 4);
    mocks.transaction.mockImplementationOnce(
      async (work: (tx: typeof fixture.tx) => Promise<unknown>) => {
        owner().passwordHash = 'concurrent-credential';
        return work(fixture.tx);
      },
    );
    await runSeed(false);
    expect(owner().passwordHash).toBe('concurrent-credential');
    expect(owner().authVersion).toBe(2);
    expect(fixture.resetUsed.size).toBe(0);
  });
  it('cannot resurrect readonly sessions when re-enabling the optional seeded account', async () => {
    vi.stubEnv('ADMIN_READONLY_EMAIL', readonlyEmail);
    const readonly = fixture.addAccount(disabledPassword);
    readonly.disabled = true;
    const session = await attach(readonly.id);
    await runSeed();
    expect(readonly).toMatchObject({ disabled: false, authVersion: 5, legacyRevoked: true });
    expect(await session.resolve()).toMatchObject({ status: 'DENIED' });
  });
  it('fails explicitly when the target disappears before the row lock', async () => {
    mocks.transaction.mockImplementationOnce(async (work) =>
      work({ ...fixture.tx, $queryRaw: async () => [] }),
    );
    await runSeed(false);
    expect(owner().authVersion).toBe(2);
    expect(fixture.resetUsed.size).toBe(0);
  });
});
