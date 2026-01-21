/**
 * Global Teardown for E2E Tests
 *
 * Cleans up test users created during E2E test runs.
 * Test users have IDs matching patterns:
 *   - e2e-test-user-*
 *   - admin-test-session-*
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const TEST_USER_PREFIXES = [
  "e2e-test-user-",
  "admin-test-session-",
  "test-user-",
];

async function globalTeardown() {
  // Skip cleanup if E2E_SKIP_CLEANUP is set (for debugging)
  if (process.env.E2E_SKIP_CLEANUP === "1") {
    console.log("E2E cleanup skipped (E2E_SKIP_CLEANUP=1)");
    return;
  }

  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "TEST_DATABASE_URL is required for E2E cleanup to avoid production writes.",
    );
  }

  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const supabaseCaCert = process.env.SUPABASE_CA_CERT;

  let ssl: { rejectUnauthorized: boolean; ca?: string } | undefined;
  if (supabaseCaCert) {
    ssl = { rejectUnauthorized: true, ca: supabaseCaCert };
  } else if (isProduction) {
    ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool({ connectionString, ssl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("E2E Teardown: Cleaning up test data...");

    let totalDeleted = 0;

    // F-04: Cleanup by isTestData flag (preferred method)
    const testDataDeleted = await prisma.$transaction(async (tx) => {
      const counts = {
        conversations: 0,
        messages: 0,
        users: 0,
      };

      // Delete test conversations (cascade will handle ToolOutput)
      const convResult = await tx.conversation.deleteMany({
        where: { isTestData: true },
      });
      counts.conversations = convResult.count;

      // Delete orphaned test messages
      const msgResult = await tx.message.deleteMany({
        where: { isTestData: true },
      });
      counts.messages = msgResult.count;

      // Delete test users (cascade will handle Profile, Settings, etc)
      const userResult = await tx.user.deleteMany({
        where: { isTestData: true },
      });
      counts.users = userResult.count;

      return counts;
    });

    totalDeleted += testDataDeleted.users;

    if (testDataDeleted.users > 0 || testDataDeleted.conversations > 0) {
      console.log(
        `  Cleaned ${testDataDeleted.users} test users, ${testDataDeleted.conversations} conversations, ${testDataDeleted.messages} messages (by isTestData flag)`,
      );
    }

    // Also clean up by user ID prefix (legacy test users)
    for (const prefix of TEST_USER_PREFIXES) {
      // Delete UserActivity first (not FK-linked)
      const activityResult = await prisma.userActivity.deleteMany({
        where: { identifier: { startsWith: prefix } },
      });

      // Delete users (cascade handles related records)
      const userResult = await prisma.user.deleteMany({
        where: { id: { startsWith: prefix } },
      });

      totalDeleted += userResult.count;

      if (userResult.count > 0) {
        console.log(
          `  Cleaned ${userResult.count} users (${prefix}*), ${activityResult.count} activity records`,
        );
      }
    }

    if (totalDeleted === 0) {
      console.log("  No test data to clean up");
    } else {
      console.log(`E2E Teardown complete: ${totalDeleted} test users removed`);
    }
  } catch (error) {
    console.error("E2E Teardown failed", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
