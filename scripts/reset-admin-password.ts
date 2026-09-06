/**
 * Targeted admin password reset.
 *
 * Resets the expected ADMIN_EMAIL administrator and revokes all prior sessions
 * and reset tokens before reenabling the account. No creates or deletes.
 *
 * Usage: npm run script -- scripts/reset-admin-password.ts
 * For Supabase, explicitly set NODE_ENV=production to retain the intended target.
 */
import { prisma } from '../apps/web/src/lib/db';
import { resetUserPassword } from '../apps/web/src/lib/auth/session-revocation';
import { assertAuthScriptTarget } from './lib/auth-script-target';
import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email || password.length < 8)
    throw new Error('ADMIN_EMAIL / ADMIN_PASSWORD missing or weak');

  assertAuthScriptTarget();
  const emailHash = sha(email);
  const matches = await prisma.user.findMany({
    where: { emailHash },
    select: { id: true, username: true, role: true, disabled: true },
  });

  if (matches.length !== 1) {
    throw new Error(`Expected exactly 1 user for ${email}, found ${matches.length} — aborting`);
  }
  const user = matches[0];
  if (user.role !== 'ADMIN') {
    throw new Error(`User ${user.id} has role ${user.role}, expected ADMIN — aborting`);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await resetUserPassword(user.id, passwordHash, false);
  await prisma.user.update({
    where: { id: user.id },
    data: { disabled: false },
  });

  const after = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true, role: true, disabled: true },
  });
  const verifies = await bcrypt.compare(password, after.passwordHash ?? '');

  console.log('updated user   :', user.id, user.username);
  console.log('role           :', after.role);
  console.log('disabled       :', after.disabled);
  console.log('password works :', verifies);
  if (!verifies) throw new Error('Verification failed after update');
}

main()
  .catch((e) => {
    console.error('RESET FAILED:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
