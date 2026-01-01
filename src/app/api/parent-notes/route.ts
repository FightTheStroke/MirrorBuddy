/**
 * API Route: Parent Notes
 *
 * CRUD operations for parent notes - auto-generated session summaries for parents.
 * Part of Session Summary & Unified Archive feature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getRecentParentNotes,
  markParentNoteViewed,
  getUnreadParentNotesCount,
} from '@/lib/session/parent-note-generator';
import { prisma } from '@/lib/db';

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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

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
  } catch (error) {
    logger.error('Failed to get parent notes', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get parent notes' },
      { status: 500 }
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
  try {
    const body = await request.json();
    const { noteId, action } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId is required' },
        { status: 400 }
      );
    }

    if (action === 'markViewed') {
      await markParentNoteViewed(noteId);

      return NextResponse.json({
        success: true,
        noteId,
        viewedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported: markViewed' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to update parent note', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update parent note' },
      { status: 500 }
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
  try {
    const body = await request.json();
    const { noteId, userId } = body;

    if (!noteId || !userId) {
      return NextResponse.json(
        { error: 'noteId and userId are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const note = await prisma.parentNote.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    await prisma.parentNote.delete({
      where: { id: noteId },
    });

    logger.info('Parent note deleted', { noteId, userId });

    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    logger.error('Failed to delete parent note', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete parent note' },
      { status: 500 }
    );
  }
}
