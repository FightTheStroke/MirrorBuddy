// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { findMany: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
  disconnect: vi.fn(),
  reset: vi.fn(),
  issue: vi.fn(),
  invalidate: vi.fn(),
  transaction: vi.fn(),
  clock: vi.fn(),
  resetTokens: vi.fn(),
}));
vi.mock('../../apps/web/src/lib/ssl-config', () => ({
  createPrismaClient: () => ({ user: mocks.user, $disconnect: mocks.disconnect }),
}));
vi.mock('../../apps/web/src/lib/db', () => ({
  prisma: { user: mocks.user, $disconnect: mocks.disconnect, $transaction: mocks.transaction },
}));
vi.mock('../../apps/web/src/lib/auth/session-revocation', () => ({
  resetUserPassword: mocks.reset,
  invalidateAllSessions: mocks.invalidate,
}));
vi.mock('../../apps/web/src/lib/auth/session-issuance', () => ({
  issuePasswordSession: mocks.issue,
}));
vi.mock('../../apps/web/src/lib/auth/cookie-signing', () => ({
  signCookieValue: () => ({ signed: 'legacy-token' }),
}));
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('new-hash'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

describe('operator credential mutation callers', () => {
  const now = new Date('2026-09-06T00:00:00Z');
  const account = {
    id: 'operator',
    role: 'ADMIN',
    passwordHash: 'old-hash',
    disabled: false,
    authVersion: 2,
    legacyRevoked: false,
    mustChangePassword: false,
    updatedAt: now,
  };
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.test');
    vi.stubEnv('ADMIN_PASSWORD', 'operator-password');
    vi.stubEnv('ADMIN_READONLY_EMAIL', '');
    vi.stubEnv('PROD_TEST_USER_EMAIL', 'test@example.test');
    vi.stubEnv('PROD_TEST_USER_PASSWORD', 'test-user-password');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('E2E_TESTS', '');
    vi.stubEnv('VERCEL', '');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mocks.reset.mockResolvedValue(undefined);
    mocks.invalidate.mockResolvedValue(undefined);
    mocks.clock.mockImplementation(async (sql: TemplateStringsArray, id?: string) =>
      sql.join('').includes('FOR UPDATE') ? [{ id }] : [{ now }],
    );
    const tx = {
      user: mocks.user,
      $queryRaw: mocks.clock,
      passwordResetToken: { updateMany: mocks.resetTokens },
    };
    mocks.transaction.mockImplementation((work: (client: typeof tx) => Promise<unknown>) =>
      work(tx),
    );
    mocks.issue.mockResolvedValue({
      token: 'native-token',
      expiresAt: new Date('2026-09-13T00:00:00Z'),
    });
    mocks.user.findMany.mockResolvedValue([{ ...account }]);
    mocks.user.create.mockResolvedValue({ id: 'new-user' });
    mocks.user.update.mockResolvedValue({ id: 'operator' });
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      id: 'operator',
      passwordHash: 'new-hash',
      authVersion: 12,
      role: 'ADMIN',
      disabled: false,
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('seeding an existing administrator globally revokes before metadata reconciliation', async () => {
    await import('../seed-admin');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.invalidate).toHaveBeenCalledWith(expect.any(Object), 'operator', now, {
      passwordHash: 'new-hash',
      mustChangePassword: false,
    });
    expect(mocks.resetTokens).toHaveBeenCalledWith({
      where: { userId: 'operator', used: false },
      data: { used: true },
    });
    expect(mocks.user.update.mock.calls[0][0].data).not.toHaveProperty('passwordHash');
    expect(mocks.invalidate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.user.update.mock.invocationCallOrder[0],
    );
  });

  it('new privileged accounts require no prior session invalidation', async () => {
    mocks.user.findMany.mockResolvedValue([]);
    await import('../seed-admin');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.user.create).toHaveBeenCalledOnce();
  });

  it('the configured readonly path skips reset only for its exact disabled password marker', async () => {
    vi.stubEnv('ADMIN_READONLY_EMAIL', 'readonly@example.test');
    const readonly = {
      ...account,
      id: 'readonly',
      role: 'ADMIN_READONLY',
      passwordHash: '!seed-admin:readonly:no-password',
      mustChangePassword: true,
    };
    mocks.user.findMany
      .mockResolvedValueOnce([{ ...account }])
      .mockResolvedValueOnce([{ ...account }])
      .mockResolvedValueOnce([readonly])
      .mockResolvedValueOnce([readonly]);
    await import('../seed-admin');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    expect(mocks.invalidate).toHaveBeenCalledWith(expect.any(Object), 'operator', now, {
      passwordHash: 'new-hash',
      mustChangePassword: false,
    });
    expect(mocks.user.update).toHaveBeenCalledWith({
      where: { id: 'readonly' },
      data: expect.objectContaining({ role: 'ADMIN_READONLY', mustChangePassword: true }),
    });
  });

  it('targeted administrator reset calls shared reset and emits no session', async () => {
    await import('../reset-admin-password');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.reset).toHaveBeenCalledWith('operator', 'new-hash', false);
    expect(mocks.user.update.mock.calls[0][0].data).not.toHaveProperty('passwordHash');
    expect(mocks.issue).not.toHaveBeenCalled();
  });

  it('provisioning repairs revoke old credentials and output only a durable native session', async () => {
    mocks.user.findMany.mockResolvedValue([{ id: 'operator', role: 'USER' }]);
    await import('../provision-prod-test-user');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.reset).toHaveBeenCalledWith('operator', 'new-hash', false);
    expect(mocks.issue).toHaveBeenCalledWith('operator', {
      passwordHash: 'new-hash',
      authVersion: 12,
    });
    expect(console.log).toHaveBeenCalledWith('PROD_TEST_USER_COOKIE_VALUE=native-token');
    expect(console.log).not.toHaveBeenCalledWith('PROD_TEST_USER_COOKIE_VALUE=legacy-token');
    expect(mocks.user.update.mock.calls[0][0].data).not.toHaveProperty('passwordHash');
  });

  it('does not publish a token or reenable an account after failed revocation', async () => {
    mocks.user.findMany.mockResolvedValue([{ id: 'operator', role: 'USER' }]);
    mocks.reset.mockRejectedValueOnce(new Error('database unavailable'));
    await import('../provision-prod-test-user');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.user.update).not.toHaveBeenCalled();
    expect(mocks.issue).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('does not silently target development storage for a Supabase operator invocation', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DATABASE_URL', 'postgresql://operator:unused@db.example.supabase.com/postgres');
    await import('../reset-admin-password');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.user.findMany).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('refuses an inherited E2E database override before accessing user records', async () => {
    vi.stubEnv('E2E_TESTS', '1');
    await import('../provision-prod-test-user');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.user.findMany).not.toHaveBeenCalled();
    expect(mocks.issue).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('does not issue when a concurrent password reset changes the provisioned credential', async () => {
    mocks.user.findMany.mockResolvedValue([{ id: 'operator', role: 'USER' }]);
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      passwordHash: 'racing-reset-hash',
      authVersion: 13,
    });
    await import('../provision-prod-test-user');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.issue).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('does not output credentials when durable issuance fails', async () => {
    mocks.user.findMany.mockResolvedValue([{ id: 'operator', role: 'USER' }]);
    mocks.issue.mockRejectedValueOnce(new Error('session persistence failed'));
    await import('../provision-prod-test-user');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('COOKIE_VALUE='));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
