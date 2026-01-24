#!/usr/bin/env npx tsx
/**
 * Cleanup Orphan UserActivity Records
 *
 * Deletes all UserActivity records that don't have a corresponding User record.
 * These are stale anonymous/trial sessions that should have been cleaned by cron.
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import "dotenv/config";
import { createPrismaClient } from "../src/lib/ssl-config";

const prisma = createPrismaClient();

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== Cleanup Orphan UserActivity Records ===\n");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}\n`);

  // Get all active identifiers
  const allActivity = await prisma.userActivity.groupBy({
    by: ["identifier"],
    _count: { identifier: true },
  });

  // Get all registered user IDs
  const registeredUsers = await prisma.user.findMany({
    select: { id: true },
  });
  const registeredIds = new Set(registeredUsers.map((u) => u.id));

  // Find orphan identifiers
  const orphans = allActivity.filter((a) => !registeredIds.has(a.identifier));

  console.log(`Total unique identifiers: ${allActivity.length}`);
  console.log(`Registered users: ${registeredIds.size}`);
  console.log(`Orphan identifiers: ${orphans.length}\n`);

  if (orphans.length === 0) {
    console.log("No orphan activity records to clean up.");
    return;
  }

  // Count total activity records for orphans
  const orphanIds = orphans.map((o) => o.identifier);
  const totalRecords = await prisma.userActivity.count({
    where: { identifier: { in: orphanIds } },
  });

  console.log(`Total orphan activity records to delete: ${totalRecords}\n`);

  if (isDryRun) {
    console.log("Dry run complete. Run without --dry-run to delete.");
    return;
  }

  // Delete orphan records
  console.log("Deleting orphan activity records...");
  const result = await prisma.userActivity.deleteMany({
    where: { identifier: { in: orphanIds } },
  });

  console.log(`\n✅ Deleted ${result.count} orphan activity records`);

  // Verify cleanup
  const remaining = await prisma.userActivity.count();
  console.log(`Remaining UserActivity records: ${remaining}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
