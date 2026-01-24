/**
 * Cleanup Test Data Script
 *
 * Removes test data marked with isTestData=true while preserving protected users.
 * This script implements F-02 and F-05 requirements by isolating test data
 * and maintaining only whitelisted user accounts.
 *
 * Protected users are specified via PROTECTED_USERS environment variable:
 * PROTECTED_USERS=roberdan@fightthestroke.org,mariodanfts@gmail.com
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-data.ts              # LIVE DELETE
 *   npx tsx scripts/cleanup-test-data.ts --dry-run    # Show what would be deleted
 *
 * Safety Features:
 * - Requires explicit --dry-run for preview mode
 * - Uses Prisma transactions for atomicity
 * - Never deletes protected users regardless of isTestData flag
 * - Logs protected users and deletion summary before/after
 * - Prevents running in production (NODE_ENV=production)
 *
 * WARNING: This script is DESTRUCTIVE. Always run with --dry-run first.
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import "dotenv/config";
import { createPrismaClient } from "../src/lib/ssl-config";
import { getProtectedUsers } from "@/lib/test-isolation/protected-users";

const prisma = createPrismaClient();

/**
 * Main cleanup function
 */
async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    "\n╔════════════════════════════════════════════════════════════╗",
  );
  console.log("║       MirrorBuddy Test Data Cleanup (F-02, F-05)          ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n",
  );

  // Production safety check
  if (process.env.NODE_ENV === "production") {
    console.error(
      "ERROR: Cannot run cleanup in production. Set NODE_ENV=development",
    );
    process.exit(1);
  }

  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE DELETE"}\n`);

  // Get protected users from environment
  const protectedEmails = getProtectedUsers();

  if (protectedEmails.length === 0) {
    console.warn(
      "WARNING: No PROTECTED_USERS defined. Running with empty whitelist.",
    );
  }

  console.log("Protected Users (will NOT be deleted):");
  if (protectedEmails.length === 0) {
    console.log("  (none)");
  } else {
    protectedEmails.forEach((email) => {
      console.log(`  ✓ ${email}`);
    });
  }
  console.log("");

  // Find and log protected users
  let protectedUserCount = 0;
  if (protectedEmails.length > 0) {
    const protectedUsersInDb = await prisma.user.findMany({
      where: {
        email: { in: protectedEmails },
      },
      select: { id: true, email: true, createdAt: true, isTestData: true },
    });

    protectedUserCount = protectedUsersInDb.length;
    console.log(`Found ${protectedUserCount} protected users in database:`);
    protectedUsersInDb.forEach((u) => {
      console.log(
        `  ✓ ${u.email || "(no email)"} (ID: ${u.id})${u.isTestData ? " [marked as test data]" : ""}`,
      );
    });
  }
  console.log("");

  // Count test data by type
  const testUserCount = await prisma.user.count({
    where: {
      isTestData: true,
      email:
        protectedEmails.length > 0 ? { notIn: protectedEmails } : undefined,
    },
  });

  const testConversationCount = await prisma.conversation.count({
    where: { isTestData: true },
  });

  const testMessageCount = await prisma.message.count({
    where: { isTestData: true },
  });

  const testSessionMetricsCount = await prisma.sessionMetrics.count({
    where: { isTestData: true },
  });

  console.log("Test Data Found (will be DELETED):");
  console.log(`  • Test Users:           ${testUserCount}`);
  console.log(`  • Test Conversations:   ${testConversationCount}`);
  console.log(`  • Test Messages:        ${testMessageCount}`);
  console.log(`  • Test SessionMetrics:  ${testSessionMetricsCount}`);
  console.log("");

  const totalTestRecords =
    testUserCount +
    testConversationCount +
    testMessageCount +
    testSessionMetricsCount;

  if (totalTestRecords === 0) {
    console.log("✓ Database is clean. No test data found.");
    return;
  }

  // In dry-run, show sample of records to be deleted
  if (isDryRun) {
    console.log("Sample of records that would be deleted:\n");

    if (testUserCount > 0) {
      const sampleUsers = await prisma.user.findMany({
        where: {
          isTestData: true,
          email:
            protectedEmails.length > 0 ? { notIn: protectedEmails } : undefined,
        },
        select: { id: true, email: true, createdAt: true },
        take: 5,
      });
      console.log("  Users:");
      sampleUsers.forEach((u) => {
        console.log(`    - ${u.email || "(no email)"} (${u.createdAt})`);
      });
      if (testUserCount > 5) {
        console.log(`    ... and ${testUserCount - 5} more`);
      }
    }

    if (testConversationCount > 0) {
      const sampleConversations = await prisma.conversation.findMany({
        where: { isTestData: true },
        select: { id: true, title: true, createdAt: true },
        take: 5,
      });
      console.log("\n  Conversations:");
      sampleConversations.forEach((c) => {
        console.log(`    - ${c.title || "(untitled)"} (${c.createdAt})`);
      });
      if (testConversationCount > 5) {
        console.log(`    ... and ${testConversationCount - 5} more`);
      }
    }

    console.log("\n\nDry run complete. To DELETE these records, run:");
    console.log("  npx tsx scripts/cleanup-test-data.ts\n");
    return;
  }

  // LIVE DELETE - Use transaction for atomicity
  console.log("Starting deletion in transaction...\n");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deletedCount = {
        conversations: 0,
        messages: 0,
        sessionMetrics: 0,
        users: 0,
      };

      // 1. Delete test conversations (cascade will handle messages)
      const conversationResult = await tx.conversation.deleteMany({
        where: { isTestData: true },
      });
      deletedCount.conversations = conversationResult.count;

      // 2. Delete orphaned test messages (in case any exist without conversation)
      const messageResult = await tx.message.deleteMany({
        where: { isTestData: true },
      });
      deletedCount.messages = messageResult.count;

      // 3. Delete test session metrics
      const metricsResult = await tx.sessionMetrics.deleteMany({
        where: { isTestData: true },
      });
      deletedCount.sessionMetrics = metricsResult.count;

      // 4. Delete test users (cascade will clean related records)
      const userResult = await tx.user.deleteMany({
        where: {
          isTestData: true,
          email:
            protectedEmails.length > 0 ? { notIn: protectedEmails } : undefined,
        },
      });
      deletedCount.users = userResult.count;

      return deletedCount;
    });

    console.log("✓ Deletion successful:\n");
    console.log(`  • Deleted Conversations:  ${result.conversations}`);
    console.log(`  • Deleted Messages:       ${result.messages}`);
    console.log(`  • Deleted SessionMetrics: ${result.sessionMetrics}`);
    console.log(`  • Deleted Users:          ${result.users}`);

    // Final verification
    const finalUserCount = await prisma.user.count();
    const finalConversationCount = await prisma.conversation.count();
    const finalMessageCount = await prisma.message.count();
    const finalMetricsCount = await prisma.sessionMetrics.count();

    console.log(
      "\n╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║                    Final Database State                    ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝\n",
    );
    console.log(`Total Users:           ${finalUserCount}`);
    console.log(`Total Conversations:   ${finalConversationCount}`);
    console.log(`Total Messages:        ${finalMessageCount}`);
    console.log(`Total SessionMetrics:  ${finalMetricsCount}\n`);

    console.log("✓ Cleanup complete. F-02 and F-05 requirements satisfied.\n");
  } catch (error) {
    console.error("\n✗ Error during deletion:");
    console.error(error);
    console.error("\nTransaction rolled back. Database state unchanged.\n");
    process.exit(1);
  }
}

// Execute and handle errors
main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
