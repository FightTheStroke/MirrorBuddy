/**
 * MIRRORBUDDY - Admin Seed Script
 *
 * Creates the initial admin user from environment variables.
 * Run on first deploy or manually: npx tsx scripts/seed-admin.ts
 *
 * Required env vars:
 * - DATABASE_URL: PostgreSQL connection string
 * - ADMIN_EMAIL: Admin email address
 * - ADMIN_PASSWORD: Admin password (min 8 chars)
 * - ADMIN_READONLY_EMAIL: Optional read-only admin email address
 *
 * Plan 052: Internal auth system
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import { createPrismaClient } from '../src/lib/ssl-config';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const readOnlyEmail = process.env.ADMIN_READONLY_EMAIL;

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
    // Extract username from email (part before @)
    const username = email.split('@')[0];

    console.log(`🔍 Checking for existing admin user: ${username}`);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingAdmin) {
      console.log(`✅ Admin user already exists (ID: ${existingAdmin.id})`);

      // Always update password when ADMIN_PASSWORD is provided
      // This ensures password changes are applied on redeploy
      const newHash = await bcrypt.hash(password, SALT_ROUNDS);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          passwordHash: newHash,
          email, // Ensure email is also up to date
          role: 'ADMIN', // Ensure role is ADMIN
        },
      });
      console.log('🔄 Admin password synchronized');
    } else {
      // Create new admin
      console.log('📝 Creating new admin user...');

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const admin = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          role: 'ADMIN',
          mustChangePassword: false,
          disabled: false,
          profile: { create: {} },
          settings: { create: {} },
          progress: { create: {} },
        },
      });

      console.log(`✅ Admin user created successfully!`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: ${username}`);
      console.log(`   Email: ${email}`);
      console.log(`   Role: ADMIN`);
    }

    if (readOnlyEmail) {
      const readOnlyUsername = readOnlyEmail.split('@')[0];
      const existingReadOnly = await prisma.user.findFirst({
        where: {
          OR: [{ username: readOnlyUsername }, { email: readOnlyEmail }],
        },
      });

      if (existingReadOnly) {
        await prisma.user.update({
          where: { id: existingReadOnly.id },
          data: {
            email: readOnlyEmail,
            role: 'ADMIN_READONLY',
          },
        });
        console.log('🔄 Read-only admin synchronized');
      } else {
        const generatedPassword = await bcrypt.hash(`${Date.now()}-readonly-admin`, SALT_ROUNDS);
        await prisma.user.create({
          data: {
            username: readOnlyUsername,
            email: readOnlyEmail,
            passwordHash: generatedPassword,
            role: 'ADMIN_READONLY',
            mustChangePassword: true,
            disabled: false,
            profile: { create: {} },
            settings: { create: {} },
            progress: { create: {} },
          },
        });
        console.log('✅ Read-only admin user created successfully!');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error) => {
  console.error('❌ Seed failed:', error.message || error);
  process.exit(1);
});
