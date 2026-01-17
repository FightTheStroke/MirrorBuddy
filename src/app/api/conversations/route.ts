// ============================================================================
// API ROUTE: Conversations
// GET: List all conversations
// POST: Create new conversation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseNotInitialized } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/tracing';
import { ConversationCreateSchema } from '@/lib/validation/schemas/conversations';
import { validateAuth } from '@/lib/auth/session-auth';
import type { Conversation, Message } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      const response = NextResponse.json({ error: auth.error || 'No user' }, { status: 401 });
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }
    const userId = auth.userId;

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

    const response = NextResponse.json({
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
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  } catch (error) {
    logger.error('Conversations GET error', { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      const response = NextResponse.json(
        { error: 'Database not initialized', message: 'Run: npx prisma db push' },
        { status: 503 }
      );
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }

    const response = NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      const response = NextResponse.json({ error: auth.error || 'No user' }, { status: 401 });
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }
    const userId = auth.userId;

    const body = await request.json();

    // #92: Validate with Zod before processing
    const validation = ConversationCreateSchema.safeParse(body);
    if (!validation.success) {
      const response = NextResponse.json(
        {
          error: 'Invalid conversation data',
          details: validation.error.issues.map(i => i.message),
        },
        { status: 400 }
      );
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }

    const data = validation.data;

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        maestroId: data.maestroId,
        title: data.title,
      },
    });

    const response = NextResponse.json({
      ...conversation,
      topics: JSON.parse(conversation.topics || '[]'),
    });
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  } catch (error) {
    logger.error('Conversations POST error', { error: String(error) });
    const response = NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }
}
