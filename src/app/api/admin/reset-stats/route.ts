import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/reset-stats
 * Emergency endpoint to reset all statistics (keeps user accounts but deletes all activity data)
 * Admin-only, requires explicit confirmation
 */
export const POST = pipe(
  withSentry("/api/admin/reset-stats"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  // Parse confirmation token
  const body = await ctx.req.json();
  const { confirm } = body;

  if (confirm !== "RESET_ALL_STATS") {
    return NextResponse.json(
      { error: "Confirmation token required" },
      { status: 400 },
    );
  }

  // Execute reset in transaction
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Delete all user activity data (keeps users and profiles)
      const conversations = await tx.conversation.deleteMany({});
      const flashcards = await tx.flashcardProgress.deleteMany({});
      const quizResults = await tx.quizResult.deleteMany({});
      const progress = await tx.progress.deleteMany({});
      const gamification = await tx.userGamification.deleteMany({});
      const learnings = await tx.learning.deleteMany({});
      const calendarEvents = await tx.calendarEvent.deleteMany({});
      const htmlSnippets = await tx.htmlSnippet.deleteMany({});
      const homeworkSessions = await tx.homeworkSession.deleteMany({});
      const notifications = await tx.notification.deleteMany({});

      return {
        conversations: conversations.count,
        flashcards: flashcards.count,
        quizResults: quizResults.count,
        progress: progress.count,
        gamification: gamification.count,
        learnings: learnings.count,
        calendarEvents: calendarEvents.count,
        htmlSnippets: htmlSnippets.count,
        homeworkSessions: homeworkSessions.count,
        notifications: notifications.count,
      };
    },
  );

  logger.info("[reset-stats] Statistics reset successful", {
    adminId: ctx.userId,
    deletedCounts: result,
  });

  return NextResponse.json({
    success: true,
    message: "Statistics reset successful",
    deleted: result,
  });
});
