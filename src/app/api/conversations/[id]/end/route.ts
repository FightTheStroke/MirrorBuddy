/**
 * API Route: End Conversation
 *
 * POST /api/conversations/[id]/end
 *
 * Closes a conversation, generates summary, evaluation, and parent note.
 * Part of Session Summary & Unified Archive feature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { endConversationWithSummary } from '@/lib/conversation/summary-generator';
import { inactivityMonitor } from '@/lib/conversation/inactivity-monitor';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/conversations/[id]/end
 *
 * End a conversation and generate summary.
 *
 * Body:
 * - userId: Required for authorization
 * - reason: Optional reason for ending ('explicit' | 'timeout' | 'system')
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: conversationId } = await context.params;
    const body = await request.json();
    const { userId, reason = 'explicit' } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Verify conversation exists and belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (!conversation.isActive) {
      return NextResponse.json(
        { error: 'Conversation already closed' },
        { status: 400 }
      );
    }

    // Stop inactivity tracking
    inactivityMonitor.stopTracking(conversationId);

    // Generate summary
    const result = await endConversationWithSummary(conversationId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

    logger.info('Conversation ended', {
      conversationId,
      userId,
      reason,
      summaryLength: result.summary.length,
      topicsCount: result.topics.length,
    });

    return NextResponse.json({
      success: true,
      conversationId,
      reason,
      summary: result.summary,
      topics: result.topics,
      learningsCount: result.learningsCount,
    });
  } catch (error) {
    logger.error('Failed to end conversation', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to end conversation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversations/[id]/end
 *
 * Get the summary for a closed conversation.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: conversationId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      select: {
        id: true,
        maestroId: true,
        isActive: true,
        summary: true,
        keyFacts: true,
        topics: true,
        updatedAt: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversationId: conversation.id,
      maestroId: conversation.maestroId,
      isActive: conversation.isActive,
      summary: conversation.summary,
      keyFacts: conversation.keyFacts ? JSON.parse(conversation.keyFacts) : null,
      topics: JSON.parse(conversation.topics),
      closedAt: conversation.isActive ? null : conversation.updatedAt,
    });
  } catch (error) {
    logger.error('Failed to get conversation summary', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get conversation summary' },
      { status: 500 }
    );
  }
}
