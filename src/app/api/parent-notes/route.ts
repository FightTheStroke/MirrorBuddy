/**
 * API Route: Parent Notes
 *
 * CRUD operations for parent notes - auto-generated session summaries for parents.
 * Part of Session Summary & Unified Archive feature.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { logger } from "@/lib/logger";
import {
  getRecentParentNotes,
  markParentNoteViewed,
  getUnreadParentNotesCount,
} from "@/lib/session/parent-note-generator";
import { prisma } from "@/lib/db";

/**
 * GET /api/parent-notes
 *
 * Get parent notes for a user.
 *
 * Query params:
 * - userId: Required user ID
 * - limit: Max results (default 10)
 * - unreadOnly: If 'true', only return unread notes
 * - countOnly: If 'true', only return unread count
 */
export const GET = pipe(
  withSentry("/api/parent-notes"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const countOnly = searchParams.get("countOnly") === "true";

  // If just counting unread
  if (countOnly) {
    const count = await getUnreadParentNotesCount(userId);
    return NextResponse.json({ unreadCount: count });
  }

  // Get notes
  let notes = await getRecentParentNotes(userId, limit);

  // Filter to unread only if requested
  if (unreadOnly) {
    notes = notes.filter((n) => !n.viewedAt);
  }

  return NextResponse.json({
    notes,
    count: notes.length,
    unreadCount: notes.filter((n) => !n.viewedAt).length,
  });
});

/**
 * PATCH /api/parent-notes
 *
 * Update a parent note (mark as viewed).
 *
 * Body:
 * - noteId: The note ID
 * - action: 'markViewed'
 */
export const PATCH = pipe(
  withSentry("/api/parent-notes"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const body = await ctx.req.json();
  const { noteId, action } = body;

  if (!noteId) {
    return NextResponse.json({ error: "noteId is required" }, { status: 400 });
  }

  if (action === "markViewed") {
    await markParentNoteViewed(noteId);

    return NextResponse.json({
      success: true,
      noteId,
      viewedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(
    { error: "Invalid action. Supported: markViewed" },
    { status: 400 },
  );
});

/**
 * DELETE /api/parent-notes
 *
 * Delete a parent note.
 *
 * Body:
 * - noteId: The note ID
 * - userId: User ID for authorization
 */
export const DELETE = pipe(
  withSentry("/api/parent-notes"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const body = await ctx.req.json();
  const { noteId } = body;

  if (!noteId) {
    return NextResponse.json({ error: "noteId is required" }, { status: 400 });
  }

  // Verify ownership
  const note = await prisma.parentNote.findFirst({
    where: { id: noteId, userId },
  });

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  await prisma.parentNote.delete({
    where: { id: noteId },
  });

  logger.info("Parent note deleted", { noteId, userId });

  return NextResponse.json({
    success: true,
    deleted: true,
  });
});
