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

let fixture = seedFixture();

async function runSeed() {
  const previous = mocks.disconnect.mock.calls.length;
  vi.resetModules();
  await import('../seed-admin');
  await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledTimes(previous + 1));
  expect(console.error).not.toHaveBeenCalled();
}

async function attachSession() {
  const account = fixture.accounts.get('readonly-owner');
  if (!account) throw new Error('Readonly fixture account is missing');
  const { createSessionToken } = await import('../../apps/web/src/lib/auth/session-token');
  const { resolveSessionToken } = await import('../../apps/web/src/lib/auth/session-reader');
  const issued = createSessionToken();
  fixture.sessions.set(issued.handleHash, {
    userId: account.id,
    authVersion: account.authVersion,
    revokedAt: null,
  });
  expect(await resolveSessionToken(issued.token)).toMatchObject({ status: 'AUTHENTICATED' });
  return { ...issued, resolve: () => resolveSessionToken(issued.token) };
}

beforeEach(() => {
  vi.clearAllMocks();
  fixture = seedFixture();
  vi.stubEnv('ADMIN_EMAIL', 'admin@example.test');
  vi.stubEnv('ADMIN_PASSWORD', 'operator-password');
  vi.stubEnv('ADMIN_READONLY_EMAIL', ` ${readonlyEmail.toUpperCase()} `);
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('E2E_TESTS', '');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('SESSION_SECRET', 'synthetic-readonly-seeder-session-secret-32-characters');
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
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('actual readonly seeding with real credential revocation', () => {
  it('preserves the native smoke session across repeated readonly seed runs', async () => {
    const account = fixture.addAccount(disabledPassword);
    const session = await attachSession();

    await runSeed();
    await runSeed();

    expect(account).toMatchObject({
      passwordHash: disabledPassword,
      authVersion: 4,
      legacyRevoked: false,
    });
    expect(fixture.sessions.get(session.handleHash)?.revokedAt).toBeNull();
    expect(fixture.resetUsed.has(account.id)).toBe(false);
    expect(await session.resolve()).toMatchObject({ status: 'AUTHENTICATED' });
  });

  it('initially provisions a non-login readonly account without invalidating anything', async () => {
    await runSeed();
    const account = fixture.accounts.get('readonly-owner');
    expect(account).toMatchObject({
      role: 'ADMIN_READONLY',
      email: readonlyEmail,
      passwordHash: disabledPassword,
      mustChangePassword: true,
      disabled: false,
      authVersion: 0,
      legacyRevoked: false,
    });
    expect(fixture.resetUsed.has('readonly-owner')).toBe(false);
    expect(fixture.sessions.size).toBe(0);
    expect(mocks.user.create).toHaveBeenCalledOnce();
    expect(mocks.user.create.mock.calls[0][0].data).toMatchObject({
      profile: { create: {} },
      settings: { create: {} },
      progress: { create: {} },
    });
    const session = await attachSession();
    await runSeed();
    expect(await session.resolve()).toMatchObject({ status: 'AUTHENTICATED' });
  });

  it('replaces a real existing bcrypt credential once and revokes copied sessions', async () => {
    const password = 'known-readonly-password';
    const hash = await bcrypt.hash(password, 4);
    const account = fixture.addAccount(hash);
    const session = await attachSession();
    const { verifyPassword } = await import('../../apps/web/src/lib/auth/password');
    expect(await verifyPassword(password, hash)).toBe(true);

    await runSeed();

    expect(account).toMatchObject({
      passwordHash: disabledPassword,
      authVersion: 5,
      legacyRevoked: true,
    });
    expect(fixture.sessions.get(session.handleHash)?.revokedAt).toEqual(now);
    expect(fixture.resetUsed.get(account.id)).toBe(true);
    expect(await session.resolve()).toMatchObject({ status: 'DENIED' });
    expect(await verifyPassword(password, account.passwordHash ?? '')).toBe(false);
    await runSeed();
    expect(account.authVersion).toBe(5);
  });

  it.each([null, '', 'not-a-bcrypt-hash', '!another-disabled-marker'])(
    'never infers that a different stored representation is the seeded marker: %j',
    async (passwordHash) => {
      const account = fixture.addAccount(passwordHash);
      const session = await attachSession();
      await runSeed();
      expect(account).toMatchObject({
        passwordHash: disabledPassword,
        authVersion: 5,
        legacyRevoked: true,
      });
      expect(await session.resolve()).toMatchObject({ status: 'DENIED' });
    },
  );

  it('does not preserve sessions when the existing role differs, even with the exact marker', async () => {
    const account = fixture.addAccount(disabledPassword, 'USER');
    const session = await attachSession();
    await runSeed();
    expect(account).toMatchObject({ role: 'ADMIN_READONLY', authVersion: 5, legacyRevoked: true });
    expect(await session.resolve()).toMatchObject({ status: 'DENIED' });
  });

  it('a later real credential reset still revokes every prior readonly session', async () => {
    const account = fixture.addAccount(disabledPassword);
    const first = await attachSession();
    const second = await attachSession();
    await runSeed();
    const { resetUserPassword } = await import('../../apps/web/src/lib/auth/session-revocation');
    const changedHash = await bcrypt.hash('changed-credential', 4);

    await resetUserPassword(account.id, changedHash, false);

    expect(account).toMatchObject({
      passwordHash: changedHash,
      authVersion: 5,
      legacyRevoked: true,
      mustChangePassword: false,
    });
    expect(await first.resolve()).toMatchObject({ status: 'DENIED' });
    expect(await second.resolve()).toMatchObject({ status: 'DENIED' });
    await runSeed();
    expect(account).toMatchObject({
      passwordHash: disabledPassword,
      authVersion: 6,
      mustChangePassword: true,
    });
    await runSeed();
    expect(account.authVersion).toBe(6);
  });

  it.each(['', 'operator-password', '0-readonly-admin', disabledPassword, 'x'.repeat(100)])(
    'the exact disabled marker cannot validate as a bcrypt password: %j',
    async (password) => {
      const { verifyPassword } = await import('../../apps/web/src/lib/auth/password');
      expect(await verifyPassword(password, disabledPassword)).toBe(false);
    },
  );
});
