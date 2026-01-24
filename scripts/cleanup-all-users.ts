/**
 * Cleanup All Users Script
 *
 * Removes ALL users except specified emails.
 * Also cleans up orphaned data (UserActivity, etc.)
 *
 * Usage: npx tsx scripts/cleanup-all-users.ts [--dry-run]
 *
 * WARNING: This is destructive! Use --dry-run first.
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import "dotenv/config";
import { createPrismaClient } from "../src/lib/ssl-config";

// Users to KEEP (everyone else gets deleted)
const PROTECTED_EMAILS = ["roberdan@fightthestroke.org"];

const prisma = createPrismaClient();

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== MirrorBuddy User Cleanup ===\n");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE DELETE"}\n`);
  console.log("Protected emails:");
  PROTECTED_EMAILS.forEach((e) => console.log(`  - ${e}`));
  console.log("");

  // Find protected users
  const protectedUsers = await prisma.user.findMany({
    where: {
      email: { in: PROTECTED_EMAILS },
    },
    select: { id: true, email: true, createdAt: true },
  });

  console.log(`Found ${protectedUsers.length} protected users:`);
  protectedUsers.forEach((u) => {
    console.log(`  - ${u.email} (ID: ${u.id})`);
  });

  const protectedIds = protectedUsers.map((u) => u.id);

  // Count users to delete
  const totalUsers = await prisma.user.count();
  const usersToDelete = totalUsers - protectedUsers.length;

  console.log(`\nTotal users in database: ${totalUsers}`);
  console.log(`Users to DELETE: ${usersToDelete}`);
  console.log(`Users to KEEP: ${protectedUsers.length}\n`);

  if (usersToDelete === 0) {
    console.log("No users to delete. Database is clean.");
    return;
  }

  if (isDryRun) {
    // Show sample of users that would be deleted
    const sample = await prisma.user.findMany({
      where: { id: { notIn: protectedIds } },
      select: { id: true, email: true, createdAt: true },
      take: 10,
    });

    console.log("Sample of users that would be deleted:");
    sample.forEach((u) => {
      console.log(`  - ${u.id} (${u.email || "no email"}) - ${u.createdAt}`);
    });

    if (usersToDelete > 10) {
      console.log(`  ... and ${usersToDelete - 10} more`);
    }

    console.log("\nDry run complete. Run without --dry-run to delete.");
    return;
  }

  // LIVE DELETE
  console.log("Starting deletion...\n");

  // 1. Clean UserActivity (not linked by FK, uses identifier)
  const activityResult = await prisma.userActivity.deleteMany({
    where: { identifier: { notIn: protectedIds } },
  });
  console.log(`Deleted ${activityResult.count} UserActivity records`);

  // 2. Clean InviteRequests (separate from users)
  const inviteResult = await prisma.inviteRequest.deleteMany({
    where: { email: { notIn: PROTECTED_EMAILS } },
  });
  console.log(`Deleted ${inviteResult.count} InviteRequest records`);

  // 3. Delete users (cascade will handle related records)
  const userResult = await prisma.user.deleteMany({
    where: { id: { notIn: protectedIds } },
  });
  console.log(`Deleted ${userResult.count} User records`);

  // Final count
  const remainingUsers = await prisma.user.count();
  const remainingActivity = await prisma.userActivity.count();

  console.log("\n=== Cleanup Complete ===");
  console.log(`Remaining users: ${remainingUsers}`);
  console.log(`Remaining activity records: ${remainingActivity}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
