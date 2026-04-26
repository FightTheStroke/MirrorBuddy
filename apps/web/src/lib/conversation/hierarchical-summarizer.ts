// HIERARCHICAL SUMMARIZER - Aggregates summaries into weekly/monthly abstractions (ADR 0085)
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Hierarchical summary of conversations aggregated by time period
 */
export interface HierarchicalSummary {
  id: string;
  userId: string;
  type: "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
  keyThemes: string[]; // Recurring topics across conversations
  consolidatedLearnings: string[]; // Key learnings for the period
  frequentTopics: Array<{ topic: string; count: number }>; // Topic frequency
  sourceConversationIds: string[]; // Source conversations
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a weekly summary by aggregating daily/conversation data
 * Combines learnings from conversations in a 7-day window
 */
export async function createWeeklySummary(
  userId: string,
  weekStart: Date,
): Promise<HierarchicalSummary> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  try {
    // Fetch all conversations in the week with summaries
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        createdAt: {
          gte: weekStart,
          lt: weekEnd,
        },
        summary: { not: null },
      },
      select: {
        id: true,
        summary: true,
        topics: true,
        keyFacts: true,
      },
    });

    const sourceConversationIds = conversations.map((c) => c.id);
    const frequentTopicsMap = new Map<string, number>();
    const consolidatedLearnings: Set<string> = new Set();

    // Aggregate topics and learnings
    conversations.forEach((conv) => {
      // Count topics
      if (conv.topics) {
        const topics = JSON.parse(conv.topics) as string[];
        topics.forEach((topic) => {
          frequentTopicsMap.set(topic, (frequentTopicsMap.get(topic) ?? 0) + 1);
        });
      }

      // Collect learnings
      if (conv.keyFacts) {
        const facts = JSON.parse(conv.keyFacts) as {
          learned?: string[];
        };
        if (facts.learned) {
          facts.learned.forEach((l) => consolidatedLearnings.add(l));
        }
      }
    });

    // Extract themes (most frequent topics)
    const frequentTopics = Array.from(frequentTopicsMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const keyThemes = frequentTopics.map((t) => t.topic);

    // Save to database
    const savedSummary = await prisma.hierarchicalSummary.create({
      data: {
        userId,
        type: "weekly",
        startDate: weekStart,
        endDate: weekEnd,
        keyThemes,
        consolidatedLearnings: Array.from(consolidatedLearnings),
        frequentTopics,
        sourceConversationIds,
      },
    });

    logger.info("Weekly summary created and saved", {
      userId,
      weekStart: weekStart.toISOString(),
      conversationCount: conversations.length,
      themeCount: keyThemes.length,
      summaryId: savedSummary.id,
    });

    return {
      id: savedSummary.id,
      userId: savedSummary.userId,
      type: savedSummary.type as "weekly" | "monthly",
      startDate: savedSummary.startDate,
      endDate: savedSummary.endDate,
      keyThemes: savedSummary.keyThemes as string[],
      consolidatedLearnings: savedSummary.consolidatedLearnings as string[],
      frequentTopics: savedSummary.frequentTopics as Array<{
        topic: string;
        count: number;
      }>,
      sourceConversationIds: savedSummary.sourceConversationIds as string[],
      createdAt: savedSummary.createdAt,
      updatedAt: savedSummary.updatedAt,
    };
  } catch (error) {
    logger.error("Failed to create weekly summary", {
      userId,
      weekStart: weekStart.toISOString(),
      error: String(error),
    });
    throw error;
  }
}

/**
 * Create a monthly summary by aggregating weekly summaries
 * Applies decay factor to older concepts
 */
export async function createMonthlySummary(
  userId: string,
  monthStart: Date,
): Promise<HierarchicalSummary> {
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  try {
    // Fetch weekly summaries for the month
    const weeklySummaries = await prisma.hierarchicalSummary.findMany({
      where: {
        userId,
        type: "weekly",
        startDate: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      orderBy: { startDate: "asc" },
    });

    const frequentTopicsMap = new Map<string, number>();
    const themesWithRecency: Array<{ theme: string; recency: number }> = [];
    const consolidatedLearnings: Set<string> = new Set();
    const sourceConversationIds: Set<string> = new Set();

    // Aggregate with decay factor (recent content weighted higher)
    weeklySummaries.forEach((week) => {
      const daysSinceWeek = Math.floor(
        (monthEnd.getTime() - new Date(week.startDate).getTime()) / 86400000,
      );
      const decayFactor = Math.exp(-daysSinceWeek / 30); // Exponential decay over month

      // Weight themes by recency
      const frequentTopicsArray = JSON.parse(
        JSON.stringify(week.frequentTopics),
      ) as Array<{ topic: string; count: number }>;
      frequentTopicsArray.forEach(({ topic, count }) => {
        const weightedCount = count * (0.5 + 0.5 * decayFactor);
        frequentTopicsMap.set(
          topic,
          (frequentTopicsMap.get(topic) ?? 0) + weightedCount,
        );
      });

      // Add themes with recency tracking
      const keyThemesArray = JSON.parse(
        JSON.stringify(week.keyThemes),
      ) as string[];
      keyThemesArray.forEach((theme) => {
        themesWithRecency.push({
          theme,
          recency: new Date(week.startDate).getTime(),
        });
      });

      // Collect learnings
      const consolidatedLearningsArray = JSON.parse(
        JSON.stringify(week.consolidatedLearnings),
      ) as string[];
      consolidatedLearningsArray.forEach((l) => consolidatedLearnings.add(l));

      // Collect source conversations
      const sourceIds = JSON.parse(
        JSON.stringify(week.sourceConversationIds),
      ) as string[];
      sourceIds.forEach((id) => sourceConversationIds.add(id));
    });

    // Sort themes by recency and frequency
    const uniqueThemes = new Map<string, number>();
    themesWithRecency.forEach(({ theme, recency }) => {
      if (!uniqueThemes.has(theme)) {
        uniqueThemes.set(theme, recency);
      }
    });

    const keyThemes = Array.from(uniqueThemes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme)
      .slice(0, 10);

    const frequentTopics = Array.from(frequentTopicsMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Save to database
    const savedSummary = await prisma.hierarchicalSummary.create({
      data: {
        userId,
        type: "monthly",
        startDate: monthStart,
        endDate: monthEnd,
        keyThemes,
        consolidatedLearnings: Array.from(consolidatedLearnings),
        frequentTopics,
        sourceConversationIds: Array.from(sourceConversationIds),
      },
    });

    logger.info("Monthly summary created and saved", {
      userId,
      monthStart: monthStart.toISOString(),
      weekCount: weeklySummaries.length,
      themeCount: keyThemes.length,
      summaryId: savedSummary.id,
    });

    return {
      id: savedSummary.id,
      userId: savedSummary.userId,
      type: savedSummary.type as "weekly" | "monthly",
      startDate: savedSummary.startDate,
      endDate: savedSummary.endDate,
      keyThemes: savedSummary.keyThemes as string[],
      consolidatedLearnings: savedSummary.consolidatedLearnings as string[],
      frequentTopics: savedSummary.frequentTopics as Array<{
        topic: string;
        count: number;
      }>,
      sourceConversationIds: savedSummary.sourceConversationIds as string[],
      createdAt: savedSummary.createdAt,
      updatedAt: savedSummary.updatedAt,
    };
  } catch (error) {
    logger.error("Failed to create monthly summary", {
      userId,
      monthStart: monthStart.toISOString(),
      error: String(error),
    });
    throw error;
  }
}
