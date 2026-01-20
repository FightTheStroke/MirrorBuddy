/**
 * Cleanup Test Users Script
 *
 * Removes users created by E2E tests from the database.
 * Test users have IDs matching patterns:
 *   - e2e-test-user-*
 *   - admin-test-session-*
 *
 * Usage: npx tsx scripts/cleanup-test-users.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_USER_PATTERNS = [
  "e2e-test-user-%",
  "admin-test-session-%",
  "test-user-%",
];

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== MirrorBuddy Test User Cleanup ===\n");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}\n`);

  // Count test users matching patterns
  let totalCount = 0;
  const counts: Record<string, number> = {};

  for (const pattern of TEST_USER_PATTERNS) {
    const count = await prisma.user.count({
      where: {
        id: { startsWith: pattern.replace("%", "") },
      },
    });
    counts[pattern] = count;
    totalCount += count;
  }

  console.log("Test users found:");
  for (const [pattern, count] of Object.entries(counts)) {
    console.log(`  ${pattern}: ${count}`);
  }
  console.log(`\nTotal: ${totalCount} test users\n`);

  if (totalCount === 0) {
    console.log("No test users to clean up.");
    return;
  }

  if (isDryRun) {
    console.log("Dry run complete. Run without --dry-run to delete.");
    return;
  }

  // Delete in order to respect foreign key constraints
  console.log("Deleting test users and related data...\n");

  for (const pattern of TEST_USER_PATTERNS) {
    const prefix = pattern.replace("%", "");

    // Delete related records first (cascade doesn't always work)
    const userIds = await prisma.user.findMany({
      where: { id: { startsWith: prefix } },
      select: { id: true },
    });

    const ids = userIds.map((u) => u.id);

    if (ids.length === 0) continue;

    // Delete conversations and messages
    const convResult = await prisma.conversation.deleteMany({
      where: { userId: { in: ids } },
    });
    console.log(`  Deleted ${convResult.count} conversations`);

    // Delete user activity
    const activityResult = await prisma.userActivity.deleteMany({
      where: { identifier: { in: ids } },
    });
    console.log(`  Deleted ${activityResult.count} activity records`);

    // Delete users
    const userResult = await prisma.user.deleteMany({
      where: { id: { startsWith: prefix } },
    });
    console.log(`  Deleted ${userResult.count} users (${pattern})`);
  }

  console.log("\nCleanup complete!");

  // Show remaining user count
  const remainingUsers = await prisma.user.count();
  console.log(`\nRemaining users in database: ${remainingUsers}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
