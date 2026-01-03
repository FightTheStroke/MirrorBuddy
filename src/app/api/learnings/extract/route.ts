// ============================================================================
// API ROUTE: Extract learnings from conversation
// POST: Analyze recent messages and extract student insights
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { extractLearnings } from '@/lib/ai/summarize';
import type { Message } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Get conversation with recent messages
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20, // Analyze last 20 messages
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.messages.length < 4) {
      return NextResponse.json({
        skipped: true,
        reason: 'Not enough messages to extract learnings',
      });
    }

    // Format messages (reverse to chronological order)
    const formattedMessages = conversation.messages.reverse().map((m: Message) => ({
      role: m.role,
      content: m.content,
    }));

    // Extract learnings
    const learnings = await extractLearnings(
      formattedMessages,
      conversation.maestroId,
      data.subject
    );

    if (learnings.length === 0) {
      return NextResponse.json({
        extracted: 0,
        message: 'No clear learnings identified from this conversation',
      });
    }

    // Save learnings
    const results = [];
    for (const learning of learnings) {
      // Check for existing similar learning
      const existing = await prisma.learning.findFirst({
        where: {
          userId,
          category: learning.category,
          insight: {
            contains: learning.insight.slice(0, 30),
          },
        },
      });

      if (existing) {
        // Reinforce existing
        const updated = await prisma.learning.update({
          where: { id: existing.id },
          data: {
            confidence: Math.min(1, existing.confidence + 0.1),
            occurrences: existing.occurrences + 1,
          },
        });
        results.push({ ...updated, reinforced: true });
      } else {
        // Create new learning
        const created = await prisma.learning.create({
          data: {
            userId,
            category: learning.category,
            insight: learning.insight,
            maestroId: conversation.maestroId,
            subject: data.subject,
            confidence: learning.confidence,
          },
        });
        results.push({ ...created, reinforced: false });
      }
    }

    return NextResponse.json({
      extracted: results.length,
      learnings: results,
    });
  } catch (error) {
    logger.error('Learnings extract POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to extract learnings' },
      { status: 500 }
    );
  }
}
