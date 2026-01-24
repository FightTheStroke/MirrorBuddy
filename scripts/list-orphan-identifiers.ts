#!/usr/bin/env npx tsx
/**
 * List Orphan Identifiers in UserActivity
 *
 * Shows all identifiers in UserActivity that don't have a User record.
 * These are likely test data or stale trial sessions.
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import "dotenv/config";
import { createPrismaClient } from "../src/lib/ssl-config";

const prisma = createPrismaClient();

async function main() {
  console.log("=== Orphan Identifiers in UserActivity ===\n");

  // Get all active identifiers from last 24h
  const activeUsers24h = await prisma.userActivity.groupBy({
    by: ["identifier"],
    where: {
      timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    _count: { identifier: true },
  });

  // Get all registered user IDs
  const registeredUsers = await prisma.user.findMany({
    select: { id: true },
  });
  const registeredIds = new Set(registeredUsers.map((u) => u.id));

  // Find orphan identifiers
  const orphans = activeUsers24h.filter(
    (a) => !registeredIds.has(a.identifier),
  );

  console.log(`Total active identifiers (24h): ${activeUsers24h.length}`);
  console.log(`Registered users: ${registeredIds.size}`);
  console.log(`Orphan identifiers: ${orphans.length}\n`);

  if (orphans.length === 0) {
    console.log("No orphan identifiers found.");
    return;
  }

  console.log("All orphan identifiers:\n");
  orphans.forEach((o, i) => {
    console.log(
      `${i + 1}. ${o.identifier} (${o._count.identifier} activity records)`,
    );
  });

  // Get sample activity for first few orphans
  console.log("\n\nSample activity for first 3 orphans:\n");
  for (const orphan of orphans.slice(0, 3)) {
    const activities = await prisma.userActivity.findMany({
      where: { identifier: orphan.identifier },
      orderBy: { timestamp: "desc" },
      take: 3,
      select: {
        route: true,
        userType: true,
        timestamp: true,
      },
    });

    console.log(`\n${orphan.identifier}:`);
    activities.forEach((a) => {
      console.log(
        `  ${a.timestamp.toISOString()} - ${a.userType} - ${a.route}`,
      );
    });
  }

  console.log("\n\nTo delete these orphan records, run:");
  console.log("npx tsx scripts/cleanup-orphan-activity.ts");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
