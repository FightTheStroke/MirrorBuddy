/**
 * API Route: Parent Notes
 *
 * CRUD operations for parent notes - auto-generated session summaries for parents.
 * Part of Session Summary & Unified Archive feature.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { logger } from "@/lib/logger";
import {
  getRecentParentNotes,
  markParentNoteViewed,
  getUnreadParentNotesCount,
} from "@/lib/session/parent-note-generator";
import { prisma } from "@/lib/db";
import * as Sentry from "@sentry/nextjs";

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
export async function GET(request: NextRequest) {
  try {
    // Security: Get userId from authenticated session only
    const { userId, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const countOnly = searchParams.get("countOnly") === "true";

    // If just counting unread
    if (countOnly) {
      const count = await getUnreadParentNotesCount(userId!);
      return NextResponse.json({ unreadCount: count });
    }

    // Get notes
    let notes = await getRecentParentNotes(userId!, limit);

    // Filter to unread only if requested
    if (unreadOnly) {
      notes = notes.filter((n) => !n.viewedAt);
    }

    return NextResponse.json({
      notes,
      count: notes.length,
      unreadCount: notes.filter((n) => !n.viewedAt).length,
    });
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/parent-notes" },
    });

    logger.error("Failed to get parent notes", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get parent notes" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/parent-notes
 *
 * Update a parent note (mark as viewed).
 *
 * Body:
 * - noteId: The note ID
 * - action: 'markViewed'
 */
export async function PATCH(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { noteId, action } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: "noteId is required" },
        { status: 400 },
      );
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
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/parent-notes" },
    });

    logger.error("Failed to update parent note", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to update parent note" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/parent-notes
 *
 * Delete a parent note.
 *
 * Body:
 * - noteId: The note ID
 * - userId: User ID for authorization
 */
export async function DELETE(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    // Security: Get userId from authenticated session only
    const { userId, errorResponse } = await requireAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: "noteId is required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const note = await prisma.parentNote.findFirst({
      where: { id: noteId, userId: userId! },
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
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/parent-notes" },
    });

    logger.error("Failed to delete parent note", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to delete parent note" },
      { status: 500 },
    );
  }
}
