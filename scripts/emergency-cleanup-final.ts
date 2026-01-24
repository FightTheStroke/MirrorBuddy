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
  console.log("🚨 EMERGENCY CLEANUP - Production Database");
  console.log(`Keeping only: ${KEEP_EMAILS.join(", ")}\n`);

  try {
    // 1. Count users before
    const totalBefore = await prisma.user.count();
    console.log(`📊 Users before: ${totalBefore}`);

    // 2. Find users to keep
    const keepUsers = await prisma.user.findMany({
      where: {
        email: {
          in: KEEP_EMAILS,
        },
      },
      select: { id: true, email: true },
    });

    console.log(`\n✅ Found ${keepUsers.length} users to KEEP:`);
    keepUsers.forEach((u) => console.log(`   - ${u.email} (${u.id})`));

    const keepUserIds = keepUsers.map((u) => u.id);

    if (keepUserIds.length !== 2) {
      throw new Error(`Expected 2 users to keep, found ${keepUserIds.length}`);
    }

    // 3. Delete all data from users NOT in keepUserIds
    console.log(`\n🗑️  Deleting all data for users NOT in keep list...`);

    // Delete related data first (foreign key constraints)

    // Conversations and messages (cascade should handle this)
    const deletedConversations = await prisma.conversation.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    console.log(`   - Conversations: ${deletedConversations.count}`);

    // User-specific tables
    const deletedProfiles = await prisma.profile
      .deleteMany({
        where: { userId: { notIn: keepUserIds } },
      })
      .catch(() => ({ count: 0 }));
    console.log(`   - Profiles: ${deletedProfiles.count}`);

    const deletedSettings = await prisma.settings
      .deleteMany({
        where: { userId: { notIn: keepUserIds } },
      })
      .catch(() => ({ count: 0 }));
    console.log(`   - Settings: ${deletedSettings.count}`);

    const deletedGoogleAccounts = await prisma.googleAccount
      .deleteMany({
        where: { userId: { notIn: keepUserIds } },
      })
      .catch(() => ({ count: 0 }));
    console.log(`   - GoogleAccounts: ${deletedGoogleAccounts.count}`);

    const deletedInvites = await prisma.inviteRequest
      .deleteMany({
        where: { userId: { notIn: keepUserIds } },
      })
      .catch(() => ({ count: 0 }));
    console.log(`   - InviteRequests: ${deletedInvites.count}`);

    // 4. Delete users NOT in keep list
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { notIn: keepUserIds },
      },
    });
    console.log(`   - Users: ${deletedUsers.count}`);

    // 5. Count users after
    const totalAfter = await prisma.user.count();
    console.log(`\n📊 Users after: ${totalAfter}`);
    console.log(
      `✅ Cleanup complete. Removed ${totalBefore - totalAfter} users.`,
    );

    // 6. List remaining users
    const remainingUsers = await prisma.user.findMany({
      select: { email: true, createdAt: true },
    });
    console.log(`\n👥 Remaining users:`);
    remainingUsers.forEach((u) =>
      console.log(`   - ${u.email} (created ${u.createdAt})`),
    );
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

emergencyCleanup()
  .then(() => {
    console.log("\n✅ Emergency cleanup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Emergency cleanup failed:", error);
    process.exit(1);
  });
