// ============================================================================
// API ROUTE: Conversations
// GET: List all conversations
// POST: Create new conversation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const maestroId = searchParams.get('maestroId');
    const activeOnly = searchParams.get('active') === 'true';

    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        ...(maestroId && { maestroId }),
        ...(activeOnly && { isActive: true }),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(
      conversations.map((c) => ({
        ...c,
        topics: JSON.parse(c.topics || '[]'),
        keyFacts: c.keyFacts ? JSON.parse(c.keyFacts) : null,
        lastMessage: c.messages[0]?.content?.slice(0, 100),
        messages: undefined, // Remove full messages from list
      }))
    );
  } catch (error) {
    logger.error('Conversations GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

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
