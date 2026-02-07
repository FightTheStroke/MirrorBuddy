// ============================================================================
// API ROUTE: User data export and deletion (GDPR compliance)
// GET: Export all user data from database
// DELETE: Deprecated - redirects to /api/privacy/delete-my-data
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";
import {
  executeUserDataDeletion,
  logDeletionAudit,
} from "@/app/api/privacy/delete-my-data/helpers";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

/**
 * GET /api/user/data - Export all user data (GDPR portability)
 * Returns all user data from database as JSON
 */
export const GET = pipe(
  withSentry("/api/user/data"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Fetch all user data from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      settings: true,
      profile: true,
      progress: true,
      sessions: true,
      flashcards: true,
      quizResults: true,
      conversations: {
        include: { messages: true },
      },
      learnings: true,
      accessibility: true,
      onboarding: true,
      pomodoroStats: true,
      calendarEvents: true,
      htmlSnippets: true,
      homeworkSessions: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Format for export
  const exportData = {
    exportDate: new Date().toISOString(),
    userData: {
      id: user.id,
      createdAt: user.createdAt,
      settings: user.settings,
      profile: user.profile,
      progress: user.progress,
      sessions: user.sessions,
      flashcards: user.flashcards,
      quizResults: user.quizResults,
      conversations: user.conversations,
      learnings: user.learnings,
      accessibility: user.accessibility,
      onboarding: user.onboarding,
      pomodoroStats: user.pomodoroStats,
      calendarEvents: user.calendarEvents,
      htmlSnippets: user.htmlSnippets,
      homeworkSessions: user.homeworkSessions,
    },
  };

  return NextResponse.json({
    success: true,
    data: exportData,
  });
});

interface DeleteRequestBody {
  /** Confirmation that user understands deletion is irreversible */
  confirmDeletion: boolean;
  /** Optional reason for deletion (for analytics) */
  reason?: string;
}

/**
 * DELETE /api/user/data - Delete all user data (GDPR erasure)
 *
 * SECURITY: Requires CSRF token and explicit confirmation
 * Uses the comprehensive GDPR deletion logic from /api/privacy/delete-my-data
 */
export const DELETE = pipe(
  withSentry("/api/user/data"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Require explicit confirmation
  let body: DeleteRequestBody;
  try {
    body = await ctx.req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body required with confirmDeletion: true" },
      { status: 400 },
    );
  }

  if (!body.confirmDeletion) {
    return NextResponse.json(
      { error: "Deletion must be explicitly confirmed" },
      { status: 400 },
    );
  }

  logger.info("GDPR deletion via /api/user/data", {
    userId: userId.slice(0, 8),
    reason: body.reason || "not provided",
  });

  // Execute comprehensive deletion (same logic as /api/privacy/delete-my-data)
  const result = await executeUserDataDeletion(userId);

  // Audit log
  logDeletionAudit(userId, body.reason);

  // Clear user cookie
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  return NextResponse.json(result);
});
