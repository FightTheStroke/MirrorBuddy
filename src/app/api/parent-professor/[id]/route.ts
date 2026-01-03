// ============================================================================
// API ROUTE: Single Parent-Professor Conversation (Issue #63)
// GET: Get conversation with all messages
// DELETE: Delete conversation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId,
        isParentMode: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: conversation.id,
      maestroId: conversation.maestroId,
      studentId: conversation.studentId,
      title: conversation.title,
      messageCount: conversation.messageCount,
      messages: conversation.messages.map((m: { id: string; role: string; content: string; createdAt: Date }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    logger.error('Parent conversation GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId,
        isParentMode: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Delete conversation (messages cascade)
    await prisma.conversation.delete({
      where: { id },
    });

    logger.info('Parent conversation deleted', { conversationId: id, userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Parent conversation DELETE error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
