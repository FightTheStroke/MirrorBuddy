/**
 * Global Teardown for E2E Tests
 *
 * Cleans up test users created during E2E test runs.
 * Test users have IDs matching patterns:
 *   - e2e-test-user-*
 *   - admin-test-session-*
 */

import { PrismaClient } from "@prisma/client";

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

  const prisma = new PrismaClient();

  try {
    console.log("E2E Teardown: Cleaning up test users...");

    let totalDeleted = 0;

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
      console.log("  No test users to clean up");
    } else {
      console.log(`E2E Teardown complete: ${totalDeleted} test users removed`);
    }
  } catch (error) {
    // Don't fail the test run if cleanup fails
    console.error("E2E Teardown warning: cleanup failed", error);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
