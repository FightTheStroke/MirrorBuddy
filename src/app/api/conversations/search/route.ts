// ============================================================================
// API ROUTE: Conversation Search
// GET: Search conversations with text, date, and maestro filters
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, isDatabaseNotInitialized } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Conversation, Message } from '@prisma/client';

interface ConversationSearchResult {
  id: string;
  maestroId: string;
  title: string | null;
  summary: string | null;
  topics: string[];
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  preview: string | null;
}

/**
 * GET /api/conversations/search
 *
 * Search conversations with flexible filtering
 *
 * Query params:
 * - q: Search query (ILIKE on title and message content)
 * - maestroId: Filter by maestro
 * - dateFrom: Start date filter (ISO string)
 * - dateTo: End date filter (ISO string)
 * - limit: Max results (default: 50)
 * - semantic: Enable semantic search (not implemented yet)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const maestroId = searchParams.get('maestroId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const _semantic = searchParams.get('semantic') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {
      userId,
    };

    // Maestro filter
    if (maestroId) {
      where.maestroId = maestroId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    // Text search on title and message content
    if (q.trim()) {
      // Search conversations by title (ILIKE equivalent)
      const titleMatches = await prisma.conversation.findMany({
        where: {
          ...where,
          title: {
            contains: q,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true },
          },
        },
      });

      // Search conversations by message content (ILIKE equivalent)
      const messageMatches = await prisma.conversation.findMany({
        where: {
          ...where,
          messages: {
            some: {
              content: {
                contains: q,
                mode: 'insensitive',
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true },
          },
        },
      });

      // Merge results (deduplicate by id)
      const combinedMap = new Map<string, typeof titleMatches[0]>();
      [...titleMatches, ...messageMatches].forEach((conv) => {
        combinedMap.set(conv.id, conv);
      });

      const conversations = Array.from(combinedMap.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

      const results: ConversationSearchResult[] = conversations.map((conv: Conversation & { messages: Pick<Message, 'content'>[] }) => ({
        id: conv.id,
        maestroId: conv.maestroId,
        title: conv.title,
        summary: conv.summary,
        topics: JSON.parse(conv.topics || '[]') as string[],
        messageCount: conv.messageCount,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        preview: conv.messages[0]?.content?.slice(0, 100) || null,
      }));

      return NextResponse.json({ results, count: results.length, semantic: false });
    }

    // No search query - return filtered conversations
    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true },
        },
      },
    });

    const results: ConversationSearchResult[] = conversations.map((conv: Conversation & { messages: Pick<Message, 'content'>[] }) => ({
      id: conv.id,
      maestroId: conv.maestroId,
      title: conv.title,
      summary: conv.summary,
      topics: JSON.parse(conv.topics || '[]') as string[],
      messageCount: conv.messageCount,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
      preview: conv.messages[0]?.content?.slice(0, 100) || null,
    }));

    return NextResponse.json({ results, count: results.length, semantic: false });
  } catch (error) {
    logger.error('Conversation search error', { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: 'Database not initialized', message: 'Run: npx prisma db push' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search conversations' },
      { status: 500 }
    );
  }
}
