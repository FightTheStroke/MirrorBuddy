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
} from '@/lib/ai';
import type { Message, ConversationSummaryResult } from './summary-types';
import { saveLearnings } from './learning-persistence';

export type { ConversationSummaryResult, Message };

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

    if (messages.length === 0) {
      // No messages at all - just mark as inactive
      logger.debug('Skipping summary for empty conversation', {
        conversationId,
        messageCount: 0,
      });

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

    if (messages.length === 1) {
      // Single message - generate simple summary without AI call
      const singleMessage = messages[0];
      const truncatedContent = singleMessage.content.substring(0, 200);
      const simpleSummary =
        singleMessage.role === 'user'
          ? `Lo studente ha chiesto: "${truncatedContent}${singleMessage.content.length > 200 ? '...' : ''}"`
          : `Il maestro ha risposto: "${truncatedContent}${singleMessage.content.length > 200 ? '...' : ''}"`;

      logger.info('Generating simple summary for single-message conversation', {
        conversationId,
        messageRole: singleMessage.role,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          isActive: false,
          summary: simpleSummary,
          keyFacts: JSON.stringify({ decisions: [], preferences: [], learned: [] }),
          topics: JSON.stringify([]),
        },
      });

      return {
        summary: simpleSummary,
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

      await saveLearnings(
        conversation.userId,
        conversation.maestroId,
        learnings,
        user?.profile?.schoolLevel
      );
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
