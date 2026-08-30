/**
 * Targeted admin password reset.
 *
 * Updates ONLY the passwordHash of the single user whose id is passed in,
 * after re-checking that the user is the expected ADMIN_EMAIL admin.
 * No creates, no deletes, no other fields touched.
 *
 * Usage: npm run script -- scripts/reset-admin-password.ts
 */
import { createPrismaClient } from '../apps/web/src/lib/ssl-config';
import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const prisma = createPrismaClient();

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email || password.length < 8)
    throw new Error('ADMIN_EMAIL / ADMIN_PASSWORD missing or weak');

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
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false, disabled: false },
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
