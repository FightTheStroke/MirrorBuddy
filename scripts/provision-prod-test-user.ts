/**
 * Provision the dedicated production test user.
 *
 * Creates (or repairs) a single non-admin user flagged isTestData=true, used by
 * the production-smoke Playwright suite. Never deletes anything, never touches
 * any other record, and refuses to run if more than one match exists.
 *
 * Env: PROD_TEST_USER_EMAIL, PROD_TEST_USER_PASSWORD
 * Usage: npm run script -- scripts/provision-prod-test-user.ts
 * For Supabase, explicitly set NODE_ENV=production to retain the intended target.
 */
import { prisma } from '../apps/web/src/lib/db';
import { resetUserPassword } from '../apps/web/src/lib/auth/session-revocation';
import { issuePasswordSession } from '../apps/web/src/lib/auth/session-issuance';
import { assertAuthScriptTarget } from './lib/auth-script-target';
import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

async function main() {
  const email = (process.env.PROD_TEST_USER_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.PROD_TEST_USER_PASSWORD ?? '';
  if (!email || password.length < 12) {
    throw new Error(
      'PROD_TEST_USER_EMAIL / PROD_TEST_USER_PASSWORD missing (password min 12 chars)',
    );
  }

  assertAuthScriptTarget();
  const emailHash = sha(email);
  const username = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '') + '-test';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = await prisma.user.findMany({
    where: { OR: [{ emailHash }, { email }, { username }] },
    select: { id: true, username: true, role: true },
  });

  if (existing.length > 1) {
    throw new Error(`Ambiguous: ${existing.length} users match — aborting`);
  }

  let userId: string;

  if (existing.length === 1) {
    if (existing[0].role !== 'USER') {
      throw new Error(`Refusing to modify ${existing[0].id}: role is ${existing[0].role}`);
    }
    await resetUserPassword(existing[0].id, passwordHash, false);
    const updated = await prisma.user.update({
      where: { id: existing[0].id },
      data: {
        email,
        emailHash,
        role: 'USER',
        isTestData: true,
        disabled: false,
      },
      select: { id: true },
    });
    userId = updated.id;
    console.log('repaired existing test user');
  } else {
    const created = await prisma.user.create({
      data: {
        username,
        email,
        emailHash,
        passwordHash,
        role: 'USER',
        isTestData: true,
        disabled: false,
        mustChangePassword: false,
        profile: { create: {} },
        settings: { create: {} },
        progress: { create: {} },
      },
      select: { id: true },
    });
    userId = created.id;
    console.log('created new test user');
  }

  const current = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true, authVersion: true },
  });
  if (current.passwordHash !== passwordHash) {
    throw new Error('Credentials changed during provisioning; aborting session issuance');
  }
  const issued = await issuePasswordSession(userId, {
    passwordHash,
    authVersion: current.authVersion,
  });

  console.log('PROD_TEST_USER_ID=' + userId);
  console.log('PROD_TEST_USER_COOKIE_VALUE=' + issued.token);
  console.log('PROD_TEST_USER_COOKIE_EXPIRES_AT=' + issued.expiresAt.toISOString());
  console.log('username=' + username);
}

main()
  .catch((e) => {
    console.error('PROVISION FAILED:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
