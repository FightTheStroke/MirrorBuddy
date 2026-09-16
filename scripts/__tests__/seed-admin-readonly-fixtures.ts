import type { UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import { snapshot } from '../../apps/web/src/lib/auth/__tests__/session-lifecycle-fixtures';

export const now = new Date('2026-09-06T00:00:00Z');
export const readonlyEmail = 'smoke-readonly@example.test';
export const disabledPassword = '!seed-admin:readonly:no-password';

interface Account {
  id: string;
  email: string;
  emailHash: string;
  role: UserRole;
  passwordHash: string | null;
  mustChangePassword: boolean;
  disabled: boolean;
  authVersion: number;
  legacyRevoked: boolean;
  updatedAt: Date;
}

interface Session {
  userId: string;
  authVersion: number;
  revokedAt: Date | null;
}

type AccountChange = Partial<Omit<Account, 'id' | 'authVersion'>> & {
  authVersion?: { increment: number };
};

/** In-memory Prisma transport only; password, reset, token and reader services stay real. */
export function seedFixture() {
  const accounts = new Map<string, Account>();
  const sessions = new Map<string, Session>();
  const resetUsed = new Map<string, boolean>();
  const addAccount = (passwordHash: string | null, role: UserRole = 'ADMIN_READONLY') => {
    const account: Account = {
      id: 'readonly-owner',
      email: readonlyEmail,
      emailHash: createHash('sha256').update(readonlyEmail).digest('hex'),
      role,
      passwordHash,
      mustChangePassword: true,
      disabled: false,
      authVersion: 4,
      legacyRevoked: false,
      updatedAt: new Date(now),
    };
    accounts.set(account.id, account);
    return account;
  };
  accounts.set('admin-owner', {
    id: 'admin-owner',
    email: 'admin@example.test',
    emailHash: createHash('sha256').update('admin@example.test').digest('hex'),
    role: 'ADMIN',
    passwordHash: 'old-admin-hash',
    mustChangePassword: false,
    disabled: false,
    authVersion: 2,
    legacyRevoked: false,
    updatedAt: new Date(now),
  });
  const user = {
    findMany: async ({
      where,
    }: {
      where: { OR: Array<{ email?: string }> };
      select: { id?: boolean; role?: boolean; passwordHash?: boolean };
    }) =>
      [...accounts.values()]
        .filter((account) => where.OR.some((candidate) => candidate.email === account.email))
        .map((account) => ({ ...account, updatedAt: new Date(account.updatedAt) })),
    update: async ({ where, data }: { where: { id: string }; data: AccountChange }) => {
      const account = accounts.get(where.id);
      if (!account) throw new Error('Unknown fixture account');
      const { authVersion, ...changes } = data;
      Object.assign(account, changes);
      if (authVersion) account.authVersion += authVersion.increment;
      account.updatedAt = new Date(account.updatedAt.getTime() + 1);
      return { ...account };
    },
    create: async ({
      data,
    }: {
      data: Omit<Account, 'id' | 'authVersion' | 'legacyRevoked' | 'updatedAt'>;
    }) => {
      const account: Account = {
        ...data,
        id: 'readonly-owner',
        authVersion: 0,
        legacyRevoked: false,
        updatedAt: new Date(now),
      };
      accounts.set(account.id, account);
      return account;
    },
  };
  const tx = {
    user,
    $queryRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => {
      if (sql.join('').includes('FOR UPDATE')) {
        const id = values[0];
        return typeof id === 'string' && accounts.has(id) ? [{ id }] : [];
      }
      return [{ now }];
    },
    authSession: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { userId: string; revokedAt: null };
        data: { revokedAt: Date };
      }) => {
        let count = 0;
        for (const session of sessions.values()) {
          if (session.userId === where.userId && session.revokedAt === null) {
            session.revokedAt = data.revokedAt;
            count++;
          }
        }
        return { count };
      },
    },
    passwordResetToken: {
      updateMany: async ({ where }: { where: { userId: string } }) => {
        resetUsed.set(where.userId, true);
        return { count: 1 };
      },
    },
  };
  const query = async (_sql: TemplateStringsArray, handleHash: string) => {
    const session = sessions.get(handleHash);
    const account = session && accounts.get(session.userId);
    if (!session || !account) throw new Error('Unknown fixture session');
    return [
      snapshot({
        dbNow: now,
        sessionActivatedAt: new Date('2026-09-05T00:00:00Z'),
        userId: account.id,
        userDisabled: account.disabled,
        userAuthVersion: account.authVersion,
        userLegacyRevoked: account.legacyRevoked,
        handleHash,
        sessionUserId: account.id,
        sessionAuthVersion: session.authVersion,
        issuedAt: new Date('2026-09-05T12:00:00Z'),
        expiresAt: new Date('2026-09-12T12:00:00Z'),
        revokedAt: session.revokedAt,
      }),
    ];
  };
  return { accounts, sessions, resetUsed, addAccount, user, tx, query };
}
