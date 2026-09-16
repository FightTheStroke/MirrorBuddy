// @vitest-environment node
import bcrypt from 'bcrypt';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readonlyEmail, seedFixture } from './seed-admin-readonly-fixtures';

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), query: vi.fn() }));
vi.mock('../../apps/web/src/lib/db', () => ({
  prisma: { $transaction: mocks.transaction, $queryRaw: mocks.query },
}));
let fixture = seedFixture();
const config = {
  NODE_ENV: 'production',
  ADMIN_EMAIL: 'admin@example.test',
  ADMIN_PASSWORD: 'operator-password',
  ADMIN_READONLY_EMAIL: readonlyEmail,
} satisfies NodeJS.ProcessEnv;
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('SESSION_SECRET', 'synthetic-recovery-integration-secret-at-least-32-chars');
  fixture = seedFixture();
  const owner = fixture.accounts.get('admin-owner')!;
  owner.passwordHash = await bcrypt.hash(config.ADMIN_PASSWORD, 4);
  fixture.addAccount(await bcrypt.hash('old-readonly-password', 4));
  for (let index = 0; index < 11; index++)
    fixture.accounts.set(`real-user-${index}`, {
      ...owner,
      id: `real-user-${index}`,
      email: '',
      emailHash: '',
      passwordHash: null,
      role: 'USER',
    });
  mocks.transaction.mockImplementation((work: (tx: typeof fixture.tx) => Promise<unknown>) =>
    work(fixture.tx),
  );
  mocks.query.mockImplementation(fixture.query);
});
afterEach(() => vi.unstubAllEnvs());

it('the actual guarded conversion revokes copied readonly sessions, not owner/real users', async () => {
  const { recoverReadonlyAccount } = await import('../lib/seed-admin-recovery');
  const { createSessionToken } = await import('../../apps/web/src/lib/auth/session-token');
  const { resolveSessionToken } = await import('../../apps/web/src/lib/auth/session-reader');
  const { verifyPassword } = await import('../../apps/web/src/lib/auth/password');
  const ownerBefore = structuredClone(fixture.accounts.get('admin-owner'));
  const realBefore = structuredClone(
    [...fixture.accounts].filter(([id]) => id.startsWith('real-user')),
  );
  const readonly = fixture.accounts.get('readonly-owner')!;
  const old = createSessionToken();
  fixture.sessions.set(old.handleHash, {
    userId: readonly.id,
    authVersion: readonly.authVersion,
    revokedAt: null,
  });
  const ownerToken = createSessionToken();
  fixture.sessions.set(ownerToken.handleHash, {
    userId: 'admin-owner',
    authVersion: ownerBefore!.authVersion,
    revokedAt: null,
  });
  expect(await resolveSessionToken(old.token)).toMatchObject({ status: 'AUTHENTICATED' });
  expect(await recoverReadonlyAccount('report', config)).toBe('CONVERSION_REQUIRED');
  expect(await resolveSessionToken(old.token)).toMatchObject({ status: 'AUTHENTICATED' });

  expect(await recoverReadonlyAccount('convert', config)).toBe('CONVERTED');

  expect(readonly).toMatchObject({
    passwordHash: '!seed-admin:readonly:no-password',
    authVersion: 5,
    legacyRevoked: true,
    mustChangePassword: true,
  });
  expect(fixture.resetUsed.get(readonly.id)).toBe(true);
  expect(await resolveSessionToken(old.token)).toMatchObject({ status: 'DENIED' });
  expect(await resolveSessionToken(ownerToken.token)).toMatchObject({ status: 'AUTHENTICATED' });
  expect(await verifyPassword('old-readonly-password', readonly.passwordHash!)).toBe(false);
  expect(fixture.accounts.get('admin-owner')).toEqual(ownerBefore);
  expect([...fixture.accounts].filter(([id]) => id.startsWith('real-user'))).toEqual(realBefore);
  expect(fixture.resetUsed.size).toBe(1);
  expect(await recoverReadonlyAccount('convert', config)).toBe('ALREADY_READY');
  expect(readonly.authVersion).toBe(5);
});
