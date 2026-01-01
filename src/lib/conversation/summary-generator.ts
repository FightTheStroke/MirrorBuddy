// ============================================================================
// SUMMARY GENERATOR
// Generates and saves conversation summaries when sessions end
// Part of Session Summary & Unified Archive feature
// ============================================================================

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  generateConversationSummary,
  extractKeyFacts,
  extractTopics,
  extractLearnings,
} from '@/lib/ai/summarize';

interface Message {
  role: string;
  content: string;
}

interface ConversationSummaryResult {
  summary: string;
  keyFacts: {
    decisions: string[];
    preferences: string[];
    learned: string[];
  };
  topics: string[];
  learningsCount: number;
}

/**
 * End a conversation and generate summary
 * Called on explicit close or inactivity timeout
 */
export async function endConversationWithSummary(
  conversationId: string
): Promise<ConversationSummaryResult | null> {
  try {
    // Fetch conversation with messages
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100, // Limit for summarization
        },
      },
    });

    if (!conversation) {
      logger.warn('Conversation not found for summary', { conversationId });
      return null;
    }

    if (!conversation.isActive) {
      logger.debug('Conversation already closed', { conversationId });
      return null;
    }

    // Convert messages to summary format
    const messages: Message[] = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (messages.length < 2) {
      // Not enough messages to summarize
      logger.debug('Skipping summary for short conversation', {
        conversationId,
        messageCount: messages.length,
      });

      // Just mark as inactive
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { isActive: false },
      });

      return {
        summary: '',
        keyFacts: { decisions: [], preferences: [], learned: [] },
        topics: [],
        learningsCount: 0,
      };
    }

    // Generate summary and extract data in parallel
    const [summary, keyFacts, topics, learnings] = await Promise.all([
      generateConversationSummary(messages),
      extractKeyFacts(messages),
      extractTopics(messages),
      extractLearnings(messages, conversation.maestroId),
    ]);

    // Update conversation with summary
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isActive: false,
        summary,
        keyFacts: JSON.stringify(keyFacts),
        topics: JSON.stringify(topics),
      },
    });

    // Save learnings to the Learning table
    if (learnings.length > 0) {
      const user = await prisma.user.findUnique({
        where: { id: conversation.userId },
        include: { profile: true },
      });

      for (const learning of learnings) {
        // Check if similar learning already exists
        const existing = await prisma.learning.findFirst({
          where: {
            userId: conversation.userId,
            category: learning.category,
            insight: learning.insight,
          },
        });

        if (existing) {
          // Update existing - increase confidence and occurrences
          await prisma.learning.update({
            where: { id: existing.id },
            data: {
              confidence: Math.min(1, existing.confidence + learning.confidence * 0.1),
              occurrences: existing.occurrences + 1,
            },
          });
        } else {
          // Create new learning
          await prisma.learning.create({
            data: {
              userId: conversation.userId,
              maestroId: conversation.maestroId,
              subject: user?.profile?.schoolLevel ?? undefined,
              category: learning.category,
              insight: learning.insight,
              confidence: learning.confidence,
            },
          });
        }
      }
    }

    logger.info('Conversation summary generated', {
      conversationId,
      summaryLength: summary.length,
      topicsCount: topics.length,
      learningsCount: learnings.length,
    });

    return {
      summary,
      keyFacts,
      topics,
      learningsCount: learnings.length,
    };
  } catch (error) {
    logger.error('Failed to generate conversation summary', {
      conversationId,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Get the last summary for a character from a user
 * Used for contextual greetings
 */
export async function getLastConversationSummary(
  userId: string,
  characterId: string
): Promise<{
  summary: string;
  topics: string[];
  lastMessageAt: Date | null;
} | null> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      userId,
      maestroId: characterId,
      isActive: false,
      summary: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!conversation || !conversation.summary) {
    return null;
  }

  return {
    summary: conversation.summary,
    topics: JSON.parse(conversation.topics) as string[],
    lastMessageAt: conversation.lastMessageAt,
  };
}

/**
 * Get recent summaries for a user (for dashboard/overview)
 */
export async function getRecentSummaries(
  userId: string,
  limit: number = 5
): Promise<
  Array<{
    id: string;
    maestroId: string;
    summary: string;
    topics: string[];
    updatedAt: Date;
  }>
> {
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      isActive: false,
      summary: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      maestroId: true,
      summary: true,
      topics: true,
      updatedAt: true,
    },
  });

  return conversations.map((c) => ({
    id: c.id,
    maestroId: c.maestroId,
    summary: c.summary ?? '',
    topics: JSON.parse(c.topics) as string[],
    updatedAt: c.updatedAt,
  }));
}
