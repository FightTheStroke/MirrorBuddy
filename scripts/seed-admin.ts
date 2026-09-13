/**
 * MIRRORBUDDY - Admin Seed Script
 *
 * Reconciles the admin (and optional read-only admin) accounts with
 * ADMIN_EMAIL / ADMIN_PASSWORD. Runs automatically after every production
 * promotion, so the password in the environment is always the password that
 * works — before this was wired in, the two drifted and locked the admin out.
 *
 * Run manually: npm run script -- scripts/seed-admin.ts
 * For Supabase, explicitly set NODE_ENV=production to retain the intended target.
 *
 * Required env vars:
 * - DATABASE_URL: PostgreSQL connection string
 * - ADMIN_EMAIL: Admin email address
 * - ADMIN_PASSWORD: Admin password (min 8 chars)
 * - ADMIN_READONLY_EMAIL: Optional read-only admin email address
 *
 * Lookups go through emailHash, the same deterministic SHA-256 the login route
 * uses (see apps/web/src/lib/security/pii-encryption.ts). Matching on the
 * plaintext email instead — as this script used to — silently misses accounts
 * whose email column is encrypted, and would then try to create a duplicate.
 *
 * Plan 052: Internal auth system
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import { prisma } from '../apps/web/src/lib/db';
import { invalidateAllSessions } from '../apps/web/src/lib/auth/session-revocation';
import { READONLY_DISABLED_PASSWORD } from '../apps/web/src/lib/auth/readonly-account';
import {
  sessionTransaction,
  sessionDatabaseNow,
} from '../apps/web/src/lib/auth/session-transaction';
import { verifyPassword } from '../apps/web/src/lib/auth/password';
import { assertAuthScriptTarget } from './lib/auth-script-target';
import { createHash } from 'node:crypto';
import { UserRole, type Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const SALT_ROUNDS = 12;

type Role = 'ADMIN' | 'ADMIN_READONLY';
const accountSelect = {
  id: true,
  role: true,
  passwordHash: true,
  disabled: true,
  authVersion: true,
  legacyRevoked: true,
  mustChangePassword: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
const accountSchema = z.object({
  id: z.string().min(1),
  role: z.nativeEnum(UserRole),
  passwordHash: z.string().nullable(),
  disabled: z.boolean(),
  authVersion: z.number().int().min(0).max(2_147_483_647),
  legacyRevoked: z.boolean(),
  mustChangePassword: z.boolean(),
  updatedAt: z.date(),
});
function checkedAccount(value: unknown) {
  const parsed = accountSchema.safeParse(value);
  if (!parsed.success) throw new Error('Invalid privileged account state');
  return parsed.data;
}

function emailHashOf(email: string): string {
  return createHash('sha256').update(email, 'utf8').digest('hex');
}

interface UpsertInput {
  prisma: typeof prisma;
  email: string;
  role: Role;
  passwordHash: string;
  mustChangePassword: boolean;
  password?: string;
}

/**
 * Create the account, or bring the existing one back in line.
 *
 * Refuses to act when more than one account matches, rather than guessing which
 * one is the real admin.
 */
async function upsertPrivilegedUser({
  prisma,
  email,
  role,
  passwordHash,
  mustChangePassword,
  password,
}: UpsertInput): Promise<void> {
  const emailHash = emailHashOf(email);
  const username = email.split('@')[0];

  const matches = await prisma.user.findMany({
    where: { OR: [{ emailHash }, { email }, { username }] },
    select: accountSelect,
  });

  if (!Array.isArray(matches)) throw new Error('Invalid privileged account lookup');
  if (matches.length > 1) {
    throw new Error(
      `${matches.length} accounts match ${username} — refusing to guess which one is ${role}`,
    );
  }

  if (matches.length === 1) {
    const previous = checkedAccount(matches[0]);
    const readonlyPasswordUnchanged =
      role === 'ADMIN_READONLY' &&
      previous.role === role &&
      !previous.disabled &&
      previous.passwordHash === READONLY_DISABLED_PASSWORD;
    const ownerPasswordUnchanged =
      role === 'ADMIN' &&
      previous.role === role &&
      !previous.disabled &&
      !previous.mustChangePassword &&
      typeof password === 'string' &&
      typeof previous.passwordHash === 'string' &&
      /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/.test(previous.passwordHash) &&
      (await verifyPassword(password, previous.passwordHash));
    await sessionTransaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "User" WHERE "id" = ${previous.id} FOR UPDATE
      `;
      if (!Array.isArray(locked) || locked.length !== 1 || locked[0]?.id !== previous.id)
        throw new Error('Privileged account changed; rerun reconciliation');
      const liveMatches = await tx.user.findMany({
        where: { OR: [{ emailHash }, { email }, { username }] },
        select: accountSelect,
      });
      if (!Array.isArray(liveMatches) || liveMatches.length !== 1)
        throw new Error('Privileged account changed; rerun reconciliation');
      const current = checkedAccount(liveMatches[0]);
      if (JSON.stringify(current) !== JSON.stringify(previous))
        throw new Error('Privileged account changed; rerun reconciliation');
      // Compose the existing revoking reset under this lock, not a nested transaction.
      if (!readonlyPasswordUnchanged && !ownerPasswordUnchanged) {
        await invalidateAllSessions(tx, previous.id, await sessionDatabaseNow(tx), {
          passwordHash,
          mustChangePassword,
        });
        await tx.passwordResetToken.updateMany({
          where: { userId: previous.id, used: false },
          data: { used: true },
        });
      }
      await tx.user.update({
        where: { id: previous.id },
        data: { email, emailHash, role, disabled: false, mustChangePassword },
      });
    });
    console.log(`🔄 ${role} synchronized (${previous.id})`);
    return;
  }

  const created = await prisma.user.create({
    data: {
      username,
      email,
      emailHash,
      passwordHash,
      role,
      mustChangePassword,
      disabled: false,
      profile: { create: {} },
      settings: { create: {} },
      progress: { create: {} },
    },
    select: { id: true },
  });
  console.log(`✅ ${role} created (${created.id})`);
}

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const readOnlyEmail = process.env.ADMIN_READONLY_EMAIL?.trim().toLowerCase();

  if (!email || !password) {
    // Silent exit - env vars are optional for Preview deployments
    // Only Production needs admin seeding
    process.exit(0);
  }

  if (password.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  try {
    assertAuthScriptTarget();
    await upsertPrivilegedUser({
      prisma,
      email,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
      password,
      mustChangePassword: false,
    });

    if (readOnlyEmail) {
      // Do not infer that an existing bcrypt credential is unusable. Convert it
      // through the revoking reset once, then preserve the explicit disabled marker.
      await upsertPrivilegedUser({
        prisma,
        email: readOnlyEmail,
        role: 'ADMIN_READONLY',
        passwordHash: READONLY_DISABLED_PASSWORD,
        mustChangePassword: true,
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error) => {
  console.error('❌ Seed failed:', error.message || error);
  process.exitCode = 1;
});
