// ============================================================================
// HIERARCHICAL SUMMARIZER
// Generates hierarchical summaries by aggregating conversation summaries
// Part of Total Memory System (ADR 0082-0090)
// ============================================================================

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface HierarchicalSummaryResult {
  keyThemes: string[];
  consolidatedLearnings: string[];
  frequentTopics: Array<{ topic: string; count: number }>;
  sourceConversationIds: string[];
}

/**
 * Generate a hierarchical summary for a user over a time period
 * Aggregates conversation summaries into a cohesive overview
 */
export async function generateHierarchicalSummary(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<HierarchicalSummaryResult | null> {
  try {
    // Fetch all conversation summaries for the period
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
        summary: { not: null },
      },
      select: {
        id: true,
        summary: true,
        topics: true,
        keyFacts: true,
        maestroId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (conversations.length === 0) {
      logger.debug("No conversations found for hierarchical summary", {
        userId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
      return null;
    }

    // Aggregate topics and learnings
    const frequentTopicsMap = new Map<string, number>();
    const consolidatedLearnings: Set<string> = new Set();
    const sourceConversationIds = conversations.map((c) => c.id);

    conversations.forEach((c) => {
      // Count topics
      if (c.topics) {
        try {
          const topics = JSON.parse(c.topics);
          if (Array.isArray(topics)) {
            topics.forEach((topic: string) => {
              frequentTopicsMap.set(
                topic,
                (frequentTopicsMap.get(topic) ?? 0) + 1,
              );
            });
          }
        } catch {
          // Skip malformed topics
        }
      }

      // Collect learnings from keyFacts
      if (c.keyFacts) {
        try {
          const facts = JSON.parse(c.keyFacts) as {
            learned?: string[];
          };
          if (facts.learned && Array.isArray(facts.learned)) {
            facts.learned.forEach((l) => consolidatedLearnings.add(l));
          }
        } catch {
          // Skip malformed keyFacts
        }
      }
    });

    // Extract themes (most frequent topics, max 10)
    const frequentTopics = Array.from(frequentTopicsMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const keyThemes = frequentTopics.map((t) => t.topic).slice(0, 5);

    return {
      keyThemes,
      consolidatedLearnings: Array.from(consolidatedLearnings),
      frequentTopics,
      sourceConversationIds,
    };
  } catch (error) {
    logger.error("Failed to generate hierarchical summary", {
      userId,
      error: String(error),
    });
    return null;
  }
}
