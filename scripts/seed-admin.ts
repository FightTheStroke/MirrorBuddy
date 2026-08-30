/**
 * MIRRORBUDDY - Admin Seed Script
 *
 * Reconciles the admin (and optional read-only admin) accounts with
 * ADMIN_EMAIL / ADMIN_PASSWORD. Runs automatically after every production
 * promotion, so the password in the environment is always the password that
 * works — before this was wired in, the two drifted and locked the admin out.
 *
 * Run manually: npm run script -- scripts/seed-admin.ts
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

import { createPrismaClient } from '../apps/web/src/lib/ssl-config';
import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

type Role = 'ADMIN' | 'ADMIN_READONLY';

function emailHashOf(email: string): string {
  return createHash('sha256').update(email, 'utf8').digest('hex');
}

interface UpsertInput {
  prisma: ReturnType<typeof createPrismaClient>;
  email: string;
  role: Role;
  passwordHash: string;
  mustChangePassword: boolean;
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
}: UpsertInput): Promise<void> {
  const emailHash = emailHashOf(email);
  const username = email.split('@')[0];

  const matches = await prisma.user.findMany({
    where: { OR: [{ emailHash }, { email }, { username }] },
    select: { id: true, role: true },
  });

  if (matches.length > 1) {
    throw new Error(
      `${matches.length} accounts match ${username} — refusing to guess which one is ${role}`,
    );
  }

  if (matches.length === 1) {
    await prisma.user.update({
      where: { id: matches[0].id },
      data: { email, emailHash, passwordHash, role, disabled: false, mustChangePassword },
    });
    console.log(`🔄 ${role} synchronized (${matches[0].id})`);
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

  const prisma = createPrismaClient();

  try {
    await upsertPrivilegedUser({
      prisma,
      email,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
      mustChangePassword: false,
    });

    if (readOnlyEmail) {
      // The read-only admin never signs in with a password: production smoke
      // tests reach it with a pre-signed cookie. The hash is deliberately
      // unguessable and unusable rather than absent.
      const unusable = await bcrypt.hash(`${Date.now()}-readonly-admin`, SALT_ROUNDS);
      await upsertPrivilegedUser({
        prisma,
        email: readOnlyEmail,
        role: 'ADMIN_READONLY',
        passwordHash: unusable,
        mustChangePassword: true,
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error) => {
  console.error('❌ Seed failed:', error.message || error);
  process.exit(1);
});
