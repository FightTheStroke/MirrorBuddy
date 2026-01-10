// ============================================================================
// API ROUTE: Conversations
// GET: List all conversations
// POST: Create new conversation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, isDatabaseNotInitialized } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Conversation, Message } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const maestroId = searchParams.get('maestroId');
    const activeOnly = searchParams.get('active') === 'true';

    const where = {
      userId,
      ...(maestroId && { maestroId }),
      ...(activeOnly && { isActive: true }),
    };

    // Get total count for pagination
    const total = await prisma.conversation.count({ where });

    // Calculate offset
    const offset = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const items = conversations.map((c: Conversation & { messages: Message[] }) => ({
      ...c,
      topics: JSON.parse(c.topics || '[]'),
      keyFacts: c.keyFacts ? JSON.parse(c.keyFacts) : null,
      lastMessage: c.messages[0]?.content?.slice(0, 100),
      messages: undefined, // Remove full messages from list
    }));

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    logger.error('Conversations GET error', { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: 'Database not initialized', message: 'Run: npx prisma db push' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.maestroId) {
      return NextResponse.json(
        { error: 'maestroId is required' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        maestroId: data.maestroId,
        title: data.title,
      },
    });

    return NextResponse.json({
      ...conversation,
      topics: JSON.parse(conversation.topics || '[]'),
    });
  } catch (error) {
    logger.error('Conversations POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
