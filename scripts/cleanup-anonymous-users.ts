/**
 * Cleanup anonymous users (email=null) from production database
 * These are trial sessions that never converted to real users
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import "dotenv/config";
import { createPrismaClient } from "../src/lib/ssl-config";

const prisma = createPrismaClient();
const PROTECTED_IDS = ["roberdan", "mariodanfts3k02"];

async function cleanup() {
  console.log("=== Cleaning up anonymous users ===\n");

  // Count before
  const before = await prisma.user.count({ where: { email: null } });
  console.log(`Found ${before} users with email=null`);

  if (before === 0) {
    console.log("Nothing to clean up!");
    await prisma.$disconnect();
    return;
  }

  // Delete anonymous users
  const result = await prisma.user.deleteMany({
    where: {
      email: null,
      id: { notIn: PROTECTED_IDS },
    },
  });

  console.log(`\n✓ Deleted ${result.count} anonymous users`);

  // Verify
  const after = await prisma.user.count({ where: { email: null } });
  console.log(`Remaining users with email=null: ${after}`);

  await prisma.$disconnect();
}

cleanup().catch(console.error);
