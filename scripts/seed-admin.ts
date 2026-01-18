/**
 * MIRRORBUDDY - Admin Seed Script
 *
 * Creates the initial admin user from environment variables.
 * Run on first deploy or manually: npx tsx scripts/seed-admin.ts
 *
 * Required env vars:
 * - ADMIN_EMAIL: Admin email address
 * - ADMIN_PASSWORD: Admin password (min 8 chars)
 *
 * Plan 052: Internal auth system
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables");
    console.error("   Set these in .env or Vercel environment variables");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ ADMIN_PASSWORD must be at least 8 characters");
    process.exit(1);
  }

  // Extract username from email (part before @)
  const username = email.split("@")[0];

  console.log(`🔍 Checking for existing admin user: ${username}`);

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingAdmin) {
    console.log(`✅ Admin user already exists (ID: ${existingAdmin.id})`);

    // Update password if different
    if (existingAdmin.passwordHash) {
      const isSame = await bcrypt.compare(password, existingAdmin.passwordHash);
      if (!isSame) {
        const newHash = await bcrypt.hash(password, SALT_ROUNDS);
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { passwordHash: newHash },
        });
        console.log("🔄 Admin password updated");
      }
    }

    return;
  }

  // Create new admin
  console.log("📝 Creating new admin user...");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: "ADMIN",
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

seedAdmin()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
