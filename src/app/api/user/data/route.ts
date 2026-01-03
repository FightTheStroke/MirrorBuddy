// ============================================================================
// API ROUTE: User data export and deletion (GDPR compliance)
// GET: Export all user data from database
// DELETE: Delete all user data from database
// ============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/user/data - Export all user data (GDPR portability)
 * Returns all user data from database as JSON
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
  } catch (error) {
    logger.error('Export user data error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/data - Delete all user data (GDPR erasure)
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ success: true, message: 'No user data to delete' });
    }

    // Delete user and all related data (cascades configured in schema)
    await prisma.user.delete({
      where: { id: userId },
    }).catch(() => {
      // User may not exist - that's fine
    });

    // Clear the user cookie
    cookieStore.delete('mirrorbuddy-user-id');

    return NextResponse.json({
      success: true,
      message: 'All user data has been deleted',
    });
  } catch (error) {
    logger.error('Delete user data error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}
