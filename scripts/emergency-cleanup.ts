// EMERGENCY: Clean production database keeping only 2 accounts
import { prisma } from "../src/lib/db.js";

const KEEP_EMAILS = ["roberdan@fightthestroke.org", "mariodanfts@gmail.com"];

async function emergencyCleanup() {
  console.log("🚨 EMERGENCY CLEANUP - Production Database");
  console.log(`Keeping only: ${KEEP_EMAILS.join(", ")}`);

  try {
    // 1. Count users before
    const totalBefore = await prisma.user.count();
    console.log(`\n📊 Users before: ${totalBefore}`);

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

    // 3. Delete all data from users NOT in keepUserIds
    console.log(`\n🗑️  Deleting all data for users NOT in keep list...`);

    // Delete related data first (foreign key constraints)
    const deletedSessions = await prisma.sessionMetrics.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    console.log(`   - SessionMetrics: ${deletedSessions.count}`);

    const deletedMessages = await prisma.message.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    console.log(`   - Messages: ${deletedMessages.count}`);

    const deletedChats = await prisma.conversation.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    console.log(`   - Conversations: ${deletedChats.count}`);

    const deletedFlashcards = await prisma.flashcard.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    console.log(`   - Flashcards: ${deletedFlashcards.count}`);

    const deletedQuizzes = await prisma.quizSession.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    console.log(`   - QuizSessions: ${deletedQuizzes.count}`);

    const deletedDocuments = await prisma.document.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    console.log(`   - Documents: ${deletedDocuments.count}`);

    // Delete GoogleAccount entries
    const deletedGoogleAccounts = await prisma.googleAccount.deleteMany({
      where: { userId: { notIn: keepUserIds } },
    });
    console.log(`   - GoogleAccounts: ${deletedGoogleAccounts.count}`);

    // Delete InviteRequest entries
    const deletedInvites = await prisma.inviteRequest.deleteMany({
      where: {
        userId: { notIn: keepUserIds },
      },
    });
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
