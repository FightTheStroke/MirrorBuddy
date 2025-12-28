// ============================================================================
// API ROUTE: Conversation summarization
// POST: Trigger LLM summarization of old messages
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  generateConversationSummary,
  extractKeyFacts,
  extractTopics,
  extractLearnings,
} from '@/lib/ai/summarize';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Minimum messages before summarization
const MIN_MESSAGES_FOR_SUMMARY = 20;
// Keep last N messages after summarization
const MESSAGES_TO_KEEP = 10;

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    // Get conversation with all messages
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
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

    // Check if summarization is needed
    if (conversation.messages.length < MIN_MESSAGES_FOR_SUMMARY) {
      return NextResponse.json({
        skipped: true,
        reason: `Only ${conversation.messages.length} messages, need at least ${MIN_MESSAGES_FOR_SUMMARY}`,
      });
    }

    // Split messages: to summarize vs to keep
    const toSummarize = conversation.messages.slice(0, -MESSAGES_TO_KEEP);
    const toKeep = conversation.messages.slice(-MESSAGES_TO_KEEP);

    // Format messages for LLM
    const formattedMessages = toSummarize.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Generate summary and extract insights in parallel
    const [summary, keyFacts, topics, learnings] = await Promise.all([
      generateConversationSummary(formattedMessages),
      extractKeyFacts(formattedMessages),
      extractTopics(formattedMessages),
      extractLearnings(
        formattedMessages,
        conversation.maestroId,
        undefined // subject not yet implemented
      ),
    ]);

    // Build combined summary
    const combinedSummary = conversation.summary
      ? `${conversation.summary}\n\n---\n\n${summary}`
      : summary;

    // Transaction: delete old messages, update conversation, save learnings
    await prisma.$transaction(async (tx) => {
      // Delete summarized messages
      await tx.message.deleteMany({
        where: {
          id: { in: toSummarize.map((m) => m.id) },
        },
      });

      // Update conversation with summary
      await tx.conversation.update({
        where: { id },
        data: {
          summary: combinedSummary,
          keyFacts: JSON.stringify(keyFacts),
          topics: JSON.stringify(topics),
          messageCount: toKeep.length,
        },
      });

      // Save extracted learnings
      for (const learning of learnings) {
        // Check for existing similar learning
        const existing = await tx.learning.findFirst({
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
          await tx.learning.update({
            where: { id: existing.id },
            data: {
              confidence: Math.min(1, existing.confidence + 0.1),
              occurrences: existing.occurrences + 1,
            },
          });
        } else {
          // Create new learning
          await tx.learning.create({
            data: {
              userId,
              category: learning.category,
              insight: learning.insight,
              maestroId: conversation.maestroId,
              confidence: learning.confidence,
            },
          });
        }
      }
    });

    return NextResponse.json({
      summarized: toSummarize.length,
      kept: toKeep.length,
      topics,
      learningsExtracted: learnings.length,
    });
  } catch (error) {
    logger.error('Summarize POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to summarize conversation' },
      { status: 500 }
    );
  }
}
