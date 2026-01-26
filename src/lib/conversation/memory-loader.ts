/**
 * Conversation Memory Loader
 *
 * Loads previous conversation context for a user-maestro pair.
 * Uses tier-specific limits from TierMemoryConfig to control:
 * - How many previous conversations are considered
 * - How far back to look (timeWindowDays)
 * - Maximum key facts and topics to store
 *
 * ADR: 0021-conversational-memory-injection.md
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getTierMemoryLimits } from "./tier-memory-config";
import type { TierName } from "@/types/tier-types";

export interface ConversationMemory {
  recentSummary: string | null;
  keyFacts: string[];
  topics: string[];
  lastSessionDate: Date | null;
}

/**
 * Load previous conversation context for a user-maestro pair.
 * Uses tier-specific memory limits to determine retention window and capacity.
 *
 * @param userId User identifier
 * @param maestroId Maestro identifier
 * @param tierName Subscription tier (defaults to 'base')
 * @returns Merged conversation memory context
 */
export async function loadPreviousContext(
  userId: string,
  maestroId: string,
  tierName: TierName = "base",
): Promise<ConversationMemory> {
  try {
    const limits = getTierMemoryLimits(tierName);

    // Trial tier has no memory (recentConversations = 0)
    if (limits.recentConversations === 0) {
      logger.debug("Trial tier: skipping memory load", { userId, maestroId });
      return {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };
    }

    // Build where clause with time window filter
    type FindManyWhere = {
      userId: string;
      maestroId: string;
      isActive: boolean;
      isParentMode: boolean;
      updatedAt?: { gte: Date };
    };

    const where: FindManyWhere = {
      userId,
      maestroId,
      isActive: false,
      isParentMode: false,
    };

    // Apply timeWindowDays filter if specified
    if (limits.timeWindowDays !== null && limits.timeWindowDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - limits.timeWindowDays);
      where.updatedAt = { gte: cutoffDate };
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limits.recentConversations,
      select: {
        summary: true,
        keyFacts: true,
        topics: true,
        updatedAt: true,
      },
    });

    if (conversations.length === 0) {
      logger.debug("No previous conversations found", {
        userId,
        maestroId,
        tierName,
      });
      return {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };
    }

    const keyFacts = mergeKeyFacts(conversations, limits.maxKeyFacts);
    const topics = mergeTopics(conversations, limits.maxTopics);

    logger.info("Loaded conversation memory", {
      userId,
      maestroId,
      tierName,
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
    logger.error(
      "Failed to load conversation memory",
      { userId, maestroId },
      error,
    );
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
 *
 * @param conversations Array of conversation objects with keyFacts
 * @param maxFacts Maximum number of facts to return (tier-specific)
 * @returns Deduplicated and limited array of key facts
 */
function mergeKeyFacts(
  conversations: Array<{ keyFacts: string | null }>,
  maxFacts: number,
): string[] {
  const allFacts = new Set<string>();

  for (const conv of conversations) {
    if (!conv.keyFacts) continue;
    try {
      const facts = JSON.parse(conv.keyFacts);
      if (Array.isArray(facts)) {
        for (const fact of facts) {
          if (typeof fact === "string" && fact.trim()) {
            allFacts.add(fact.trim());
          }
        }
      }
    } catch {
      // Invalid JSON in keyFacts, log warning and skip
      logger.warn("Invalid JSON in keyFacts, skipping", {
        keyFacts: conv.keyFacts?.substring(0, 100),
      });
    }
  }

  // Return facts limited to tier-specific max
  return Array.from(allFacts).slice(0, maxFacts);
}

/**
 * Merge topics from multiple conversations, deduplicating and limiting.
 *
 * @param conversations Array of conversation objects with topics
 * @param maxTopics Maximum number of topics to return (tier-specific)
 * @returns Deduplicated and limited array of topics
 */
function mergeTopics(
  conversations: Array<{ topics: string }>,
  maxTopics: number,
): string[] {
  const allTopics = new Set<string>();

  for (const conv of conversations) {
    try {
      const topics = JSON.parse(conv.topics);
      if (Array.isArray(topics)) {
        for (const topic of topics) {
          if (typeof topic === "string" && topic.trim()) {
            allTopics.add(topic.trim());
          }
        }
      }
    } catch {
      // Invalid JSON in topics, log warning and skip
      logger.warn("Invalid JSON in topics, skipping", {
        topics: conv.topics?.substring(0, 100),
      });
    }
  }

  // Return topics limited to tier-specific max
  return Array.from(allTopics).slice(0, maxTopics);
}

/**
 * Format a date as relative time in Italian.
 */
export function formatRelativeDate(date: Date | null): string {
  if (!date) return "data sconosciuta";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "oggi";
  if (diffDays === 1) return "ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 14) return "la settimana scorsa";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  if (diffDays < 60) return "il mese scorso";
  return `${Math.floor(diffDays / 30)} mesi fa`;
}
