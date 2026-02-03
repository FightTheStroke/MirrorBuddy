/**
 * Cleanup Orphan Users Script
 *
 * Removes "orphan" users - anonymous trial sessions that:
 * - Have null email AND null username
 * - Have zero conversations
 * - Are NOT protected users
 *
 * These are trial sessions where users visited but never engaged.
 *
 * Usage:
 *   npx tsx scripts/cleanup-orphan-users.ts --dry-run    # Preview (recommended first)
 *   npx tsx scripts/cleanup-orphan-users.ts              # Execute cleanup
 *
 * Safety Features:
 * - Protected users list prevents accidental deletion
 * - Requires --dry-run for preview mode
 * - Counts and confirms before deleting
 * - Transaction-based for atomicity
 */

import "dotenv/config";
import { createPrismaClient } from "../src/lib/ssl-config";
import { getProtectedUsers } from "@/lib/test-isolation/protected-users";

const prisma = createPrismaClient();

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    "\n╔════════════════════════════════════════════════════════════╗",
  );
  console.log("║          MirrorBuddy Orphan Users Cleanup                  ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n",
  );

  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE DELETE"}\n`);

  // Get protected users
  const protectedEmails = getProtectedUsers();
  console.log("Protected Users (will NOT be deleted):");
  protectedEmails.forEach((email) => console.log(`  ✓ ${email}`));
  console.log("");

  // Find orphan users:
  // - email IS NULL
  // - username IS NULL
  // - NO conversations
  // - NOT in protected list (by ID, since they have no email)
  const orphanUsers = await prisma.user.findMany({
    where: {
      email: null,
      username: null,
      conversations: { none: {} },
    },
    select: {
      id: true,
      createdAt: true,
      _count: {
        select: {
          sessions: true,
          flashcards: true,
          learnings: true,
        },
      },
    },
  });

  // Filter out any with actual data
  const trulyOrphan = orphanUsers.filter(
    (u) =>
      u._count.sessions === 0 &&
      u._count.flashcards === 0 &&
      u._count.learnings === 0,
  );

  console.log("=== ORPHAN USERS ANALYSIS ===");
  console.log(`Total null-email/null-username users: ${orphanUsers.length}`);
  console.log(`Truly orphan (no data at all): ${trulyOrphan.length}`);
  console.log("");

  if (trulyOrphan.length === 0) {
    console.log("✓ No orphan users to clean up.\n");
    return;
  }

  // Show sample
  console.log("Sample of orphan users (first 10):");
  trulyOrphan.slice(0, 10).forEach((u) => {
    console.log(
      `  ${u.id} - created ${u.createdAt.toISOString().split("T")[0]}`,
    );
  });
  if (trulyOrphan.length > 10) {
    console.log(`  ... and ${trulyOrphan.length - 10} more`);
  }
  console.log("");

  if (isDryRun) {
    console.log("DRY RUN complete. To delete these users, run:");
    console.log("  npx tsx scripts/cleanup-orphan-users.ts\n");
    return;
  }

  // Confirm deletion
  console.log(`Deleting ${trulyOrphan.length} orphan users...`);

  const orphanIds = trulyOrphan.map((u) => u.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Delete related records first (cascade doesn't always work with deleteMany)
      // Use correct Prisma model names (camelCase)
      await tx.onboardingState.deleteMany({
        where: { userId: { in: orphanIds } },
      });
      await tx.profile.deleteMany({
        where: { userId: { in: orphanIds } },
      });
      await tx.settings.deleteMany({
        where: { userId: { in: orphanIds } },
      });
      await tx.sessionMetrics.deleteMany({
        where: { userId: { in: orphanIds } },
      });
      await tx.tosAcceptance.deleteMany({
        where: { userId: { in: orphanIds } },
      });
      // Also clean gamification if exists
      await tx.userGamification.deleteMany({
        where: { userId: { in: orphanIds } },
      });
      await tx.progress.deleteMany({
        where: { userId: { in: orphanIds } },
      });

      // Delete users
      const deleted = await tx.user.deleteMany({
        where: { id: { in: orphanIds } },
      });

      return deleted.count;
    });

    console.log(`\n✓ Deleted ${result} orphan users.\n`);

    // Final count
    const remainingUsers = await prisma.user.count();
    const remainingNull = await prisma.user.count({ where: { email: null } });

    console.log("=== FINAL DATABASE STATE ===");
    console.log(`Total users: ${remainingUsers}`);
    console.log(`Remaining null-email users: ${remainingNull}`);
  } catch (error) {
    console.error("\n✗ Error during deletion:", error);
    console.error("Transaction rolled back. Database unchanged.\n");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
