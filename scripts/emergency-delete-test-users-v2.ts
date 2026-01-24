/**
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */
import { config } from "dotenv";
import { createPrismaClient } from "../src/lib/ssl-config";

config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const prisma = createPrismaClient();

const KEEP_EMAILS = ["roberdan@fightthestroke.org", "mariodanfts@gmail.com"];

async function emergencyCleanup() {
  console.log("🚨 EMERGENCY CLEANUP - DELETING TEST USERS");

  // Find users to delete (null email/username OR not in KEEP list)
  const usersToDelete = await prisma.user.findMany({
    where: {
      OR: [{ email: null }, { email: { notIn: KEEP_EMAILS } }],
    },
    select: { id: true, email: true, username: true, createdAt: true },
  });

  console.log(`\n❌ Found ${usersToDelete.length} users to DELETE:`);
  usersToDelete.forEach((u) =>
    console.log(
      `  - ${u.email || "NULL"} (${u.username || "NULL"}) - ${u.createdAt.toISOString()}`,
    ),
  );

  if (usersToDelete.length === 0) {
    console.log("✅ No test users to delete");
    await prisma.$disconnect();
    return;
  }

  const userIds = usersToDelete.map((u) => u.id);

  console.log("\n🗑️  Deleting related data...");

  // Use raw SQL with CASCADE to delete everything
  console.log("  Using CASCADE delete...");

  const result = await prisma.$transaction(async () => {
    // Delete users - CASCADE should handle related data
    const _userIdsString = userIds.map((id) => `'${id}'`).join(",");

    // Execute raw DELETE with CASCADE (if schema has ON DELETE CASCADE)
    // Otherwise we need to manually delete related records first
    const users = await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });

    return { users: users.count };
  });

  console.log("\n✅ CLEANUP COMPLETE");
  console.log("   Total deleted:", JSON.stringify(result, null, 2));

  // Verify remaining users
  const remaining = await prisma.user.findMany({
    select: { email: true, username: true },
  });
  console.log(`\n✅ Remaining users: ${remaining.length}`);
  remaining.forEach((u) =>
    console.log(`  ✓ ${u.email || "NULL"} (${u.username || "NULL"})`),
  );

  await prisma.$disconnect();
}

emergencyCleanup().catch(console.error);
