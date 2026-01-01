/**
 * Conversation Memory Loader
 *
 * Loads previous conversation context for a user-maestro pair.
 * Used to inject memory into AI system prompts for continuity.
 *
 * ADR: 0021-conversational-memory-injection.md
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface ConversationMemory {
  recentSummary: string | null;
  keyFacts: string[];
  topics: string[];
  lastSessionDate: Date | null;
}

const MAX_KEY_FACTS = 5;
const MAX_TOPICS = 10;
const MAX_CONVERSATIONS = 3;

/**
 * Load previous conversation context for a user-maestro pair.
 * Fetches the last 3 closed conversations and merges their data.
 */
export async function loadPreviousContext(
  userId: string,
  maestroId: string
): Promise<ConversationMemory> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        maestroId,
        isActive: false,
        isParentMode: false, // Exclude parent mode conversations
      },
      orderBy: { updatedAt: 'desc' },
      take: MAX_CONVERSATIONS,
      select: {
        summary: true,
        keyFacts: true,
        topics: true,
        updatedAt: true,
      },
    });

    if (conversations.length === 0) {
      logger.debug('No previous conversations found', { userId, maestroId });
      return {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };
    }

    const keyFacts = mergeKeyFacts(conversations);
    const topics = mergeTopics(conversations);

    logger.info('Loaded conversation memory', {
      userId,
      maestroId,
      conversationCount: conversations.length,
      keyFactCount: keyFacts.length,
      topicCount: topics.length,
    });

    return {
      recentSummary: conversations[0].summary,
      keyFacts,
      topics,
      lastSessionDate: conversations[0].updatedAt,
    };
  } catch (error) {
    logger.error('Failed to load conversation memory', { userId, maestroId, error });
    return {
      recentSummary: null,
      keyFacts: [],
      topics: [],
      lastSessionDate: null,
    };
  }
}

/**
 * Merge key facts from multiple conversations, deduplicating and limiting.
 */
function mergeKeyFacts(
  conversations: Array<{ keyFacts: string | null }>
): string[] {
  const allFacts = new Set<string>();

  for (const conv of conversations) {
    if (!conv.keyFacts) continue;
    try {
      const facts = JSON.parse(conv.keyFacts);
      if (Array.isArray(facts)) {
        for (const fact of facts) {
          if (typeof fact === 'string' && fact.trim()) {
            allFacts.add(fact.trim());
          }
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  // Return most recent facts first (limited)
  return Array.from(allFacts).slice(0, MAX_KEY_FACTS);
}

/**
 * Merge topics from multiple conversations, deduplicating and limiting.
 */
function mergeTopics(
  conversations: Array<{ topics: string }>
): string[] {
  const allTopics = new Set<string>();

  for (const conv of conversations) {
    try {
      const topics = JSON.parse(conv.topics);
      if (Array.isArray(topics)) {
        for (const topic of topics) {
          if (typeof topic === 'string' && topic.trim()) {
            allTopics.add(topic.trim());
          }
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  // Return unique topics (limited)
  return Array.from(allTopics).slice(0, MAX_TOPICS);
}

/**
 * Format a date as relative time in Italian.
 */
export function formatRelativeDate(date: Date | null): string {
  if (!date) return 'data sconosciuta';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'oggi';
  if (diffDays === 1) return 'ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 14) return 'la settimana scorsa';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  if (diffDays < 60) return 'il mese scorso';
  return `${Math.floor(diffDays / 30)} mesi fa`;
}
