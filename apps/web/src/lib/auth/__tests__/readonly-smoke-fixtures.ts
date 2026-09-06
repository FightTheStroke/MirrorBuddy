import { afterEach, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { _resetSecretCache } from '../cookie-signing';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  query: vi.fn(),
  users: vi.fn(),
  create: vi.fn(),
  findSession: vi.fn(),
  revoke: vi.fn(),
  accountWrite: vi.fn(),
  disconnect: vi.fn(),
  end: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: mocks.transaction,
    $queryRaw: mocks.query,
    $disconnect: mocks.disconnect,
  },
  dbPool: { end: mocks.end },
}));
export const transport = mocks;
export const now = new Date('2026-09-06T10:00:00.000Z');
export const readonlyEmail = 'readonly-smoke@example.test';
export const emailHash = createHash('sha256').update(readonlyEmail).digest('hex');
export const account = {
  id: 'readonly-fixture-owner',
  emailHash,
  role: 'ADMIN_READONLY',
  passwordHash: '!seed-admin:readonly:no-password',
  disabled: false,
  authVersion: 4,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('ADMIN_READONLY_EMAIL', ` ${readonlyEmail.toUpperCase()} `);
  vi.stubEnv('SESSION_SECRET', 'synthetic-readonly-smoke-session-secret-for-unit-tests');
  _resetSecretCache();
  transport.transaction.mockImplementation(async (work) =>
    work({
      $queryRaw: transport.query,
      user: { findMany: transport.users, update: transport.accountWrite },
      authSession: {
        create: transport.create,
        findUnique: transport.findSession,
        updateMany: transport.revoke,
      },
    }),
  );
  transport.query.mockResolvedValue([{ now }]);
  transport.users.mockResolvedValue([{ ...account }]);
  transport.create.mockImplementation(async ({ data }) => data);
  transport.revoke.mockResolvedValue({ count: 1 });
});
afterEach(() => {
  vi.unstubAllEnvs();
  _resetSecretCache();
});

export function storedRow() {
  const data: unknown = transport.create.mock.calls[0]?.[0]?.data;
  if (
    !data ||
    typeof data !== 'object' ||
    !('handleHash' in data) ||
    typeof data.handleHash !== 'string'
  )
    throw new Error('Missing session fixture');
  return { ...data, handleHash: data.handleHash, revokedAt: null };
}
