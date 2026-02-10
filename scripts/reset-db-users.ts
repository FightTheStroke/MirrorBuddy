/**
 * Reset database users
 * Keeps only:
 * - roberdan@fightthestroke.org (ADMIN)
 * - Mariodanfts@gmail.com (USER)
 *
 * Run with: npx tsx scripts/reset-db-users.ts
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { createPrismaClient } from '../src/lib/ssl-config';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const prisma = createPrismaClient();

const KEEP_EMAILS = [
  'roberdan@fightthestroke.org',
  'mariodanfts@gmail.com', // lowercase for comparison
];

async function main() {
  console.log('🔄 Starting database reset...\n');

  // 1. Find users to keep
  const keepUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: KEEP_EMAILS, mode: 'insensitive' } },
        { googleAccount: { email: { in: KEEP_EMAILS, mode: 'insensitive' } } },
      ],
    },
    include: { googleAccount: true },
  });

  console.log('Users to KEEP:');
  keepUsers.forEach((u) => console.log(`  - ${u.email || u.googleAccount?.email} (${u.role})`));

  const keepIds = keepUsers.map((u) => u.id);

  // 2. Find users to delete
  const toDelete = await prisma.user.findMany({
    where: { id: { notIn: keepIds } },
    select: { id: true, email: true, username: true },
  });

  console.log(`\nUsers to DELETE (${toDelete.length}):`);
  toDelete.forEach((u) => console.log(`  - ${u.email || u.username}`));

  if (toDelete.length === 0) {
    console.log('\n✅ No users to delete');
  } else {
    // 3. Delete related data and users
    const deleteIds = toDelete.map((u) => u.id);

    console.log('\n🗑️  Deleting related data...');

    // Delete in correct order (foreign key constraints)
    await prisma.deletedUserBackup.deleteMany({});
    console.log('  - Deleted user backups (trash)');

    await prisma.inviteRequest.deleteMany({});
    console.log('  - Deleted invite requests');

    await prisma.conversation.deleteMany({
      where: { userId: { in: deleteIds } },
    });
    console.log('  - Deleted conversations');

    await prisma.studySession.deleteMany({
      where: { userId: { in: deleteIds } },
    });
    console.log('  - Deleted study sessions');

    await prisma.flashcardProgress.deleteMany({
      where: { userId: { in: deleteIds } },
    });
    console.log('  - Deleted flashcard progress');

    await prisma.achievementProgress.deleteMany({
      where: { userId: { in: deleteIds } },
    });
    console.log('  - Deleted achievement progress');

    await prisma.session.deleteMany({
      where: { userId: { in: deleteIds } },
    });
    console.log('  - Deleted sessions');

    await prisma.userSettings.deleteMany({
      where: { userId: { in: deleteIds } },
    });
    console.log('  - Deleted user settings');

    await prisma.studentProfile.deleteMany({
      where: { userId: { in: deleteIds } },
    });
    console.log('  - Deleted student profiles');

    await prisma.googleAccount.deleteMany({
      where: { userId: { in: deleteIds } },
    });
    console.log('  - Deleted Google accounts');

    // Finally delete users
    const deleted = await prisma.user.deleteMany({
      where: { id: { in: deleteIds } },
    });
    console.log(`  - Deleted ${deleted.count} users`);
  }

  // 4. Ensure correct roles
  console.log('\n🔧 Setting correct roles...');

  const roberdan = keepUsers.find(
    (u) =>
      u.email?.toLowerCase() === 'roberdan@fightthestroke.org' ||
      u.googleAccount?.email?.toLowerCase() === 'roberdan@fightthestroke.org',
  );

  const mario = keepUsers.find(
    (u) =>
      u.email?.toLowerCase() === 'mariodanfts@gmail.com' ||
      u.googleAccount?.email?.toLowerCase() === 'mariodanfts@gmail.com',
  );

  if (roberdan && roberdan.role !== 'ADMIN') {
    await prisma.user.update({
      where: { id: roberdan.id },
      data: { role: 'ADMIN' },
    });
    console.log('  - Set roberdan as ADMIN');
  }

  if (mario && mario.role !== 'USER') {
    await prisma.user.update({
      where: { id: mario.id },
      data: { role: 'USER' },
    });
    console.log('  - Set mario as USER');
  }

  // 5. Final count
  const finalUsers = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      username: true,
      googleAccount: { select: { email: true } },
    },
  });

  console.log('\n✅ Database reset complete!');
  console.log('\nFinal users:');
  finalUsers.forEach((u) =>
    console.log(`  - ${u.email || u.googleAccount?.email || u.username}: ${u.role}`),
  );
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
