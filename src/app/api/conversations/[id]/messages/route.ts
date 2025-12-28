// ============================================================================
// API ROUTE: Conversation messages
// GET: Get messages for a conversation
// POST: Add new message
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
    const userId = cookieStore.get('convergio-user-id')?.value;
    const { id: conversationId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(messages);
  } catch (error) {
    logger.error('Messages GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;
    const { id: conversationId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const data = await request.json();

    if (!data.role || !data.content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      );
    }

    // Create message and update conversation
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          role: data.role,
          content: data.content,
          toolCalls: data.toolCalls ? JSON.stringify(data.toolCalls) : null,
          tokenCount: data.tokenCount,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date(),
          // Update title from first user message if not set
          ...(conversation.title === null &&
            data.role === 'user' && {
              title: data.content.slice(0, 50),
            }),
        },
      }),
    ]);

    return NextResponse.json(message);
  } catch (error) {
    logger.error('Messages POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
