// ============================================================================
// CRON HIERARCHICAL SUMMARIZATION
// Runs on schedule to generate weekly and monthly hierarchical summaries
// Part of Total Memory System (ADR 0082-0090)
// ============================================================================

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateHierarchicalSummary } from "./hierarchical-summarizer";

const BATCH_SIZE = 10;

/**
 * Check if a weekly summary should be generated for a user
 * Returns true if no summary exists for the given week
 */
export async function shouldGenerateWeeklySummary(
  userId: string,
  weekStart: Date,
): Promise<boolean> {
  const existing = await prisma.hierarchicalSummary.findFirst({
    where: {
      userId,
      type: "weekly",
      startDate: weekStart,
    },
  });

  return !existing;
}

/**
 * Check if a monthly summary should be generated for a user
 * Returns true if no summary exists for the given month
 */
export async function shouldGenerateMonthlySummary(
  userId: string,
  monthStart: Date,
): Promise<boolean> {
  const existing = await prisma.hierarchicalSummary.findFirst({
    where: {
      userId,
      type: "monthly",
      startDate: monthStart,
    },
  });

  return !existing;
}

/**
 * Main cron function: Generate hierarchical summaries for all active users
 * - Finds users with conversations in the past week
 * - Creates weekly summaries if they don't exist
 * - On 1st of month, also creates monthly summaries
 * - Processes in batches to prevent timeout
 */
export async function runHierarchicalSummarization(): Promise<void> {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    logger.info("Hierarchical summarization started", {
      weekStart: weekStart.toISOString(),
      timestamp: now.toISOString(),
    });

    // Find all users with conversations in the past week
    const usersWithConversations = await prisma.user.findMany({
      where: {
        conversations: {
          some: {
            createdAt: { gte: weekStart },
          },
        },
      },
      select: { id: true },
    });

    if (usersWithConversations.length === 0) {
      logger.info("No users found with recent conversations", {
        weekStart: weekStart.toISOString(),
      });
      return;
    }

    logger.info("Found users for summarization", {
      count: usersWithConversations.length,
    });

    // Process users in batches
    for (let i = 0; i < usersWithConversations.length; i += BATCH_SIZE) {
      const batch = usersWithConversations.slice(
        i,
        Math.min(i + BATCH_SIZE, usersWithConversations.length),
      );

      logger.info("Processing batch", {
        batchNumber: Math.ceil((i + 1) / BATCH_SIZE),
        batchSize: batch.length,
        totalBatches: Math.ceil(usersWithConversations.length / BATCH_SIZE),
      });

      // Process each user in the batch
      for (const user of batch) {
        try {
          // Generate weekly summary
          if (await shouldGenerateWeeklySummary(user.id, weekStart)) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const summary = await generateHierarchicalSummary(
              user.id,
              weekStart,
              weekEnd,
            );

            if (summary) {
              await prisma.hierarchicalSummary.create({
                data: {
                  userId: user.id,
                  type: "weekly",
                  startDate: weekStart,
                  endDate: weekEnd,
                  keyThemes: summary.keyThemes || [],
                  consolidatedLearnings: summary.consolidatedLearnings || [],
                  frequentTopics: summary.frequentTopics || [],
                  sourceConversationIds: summary.sourceConversationIds || [],
                },
              });

              logger.info("Weekly summary created", {
                userId: user.id,
                periodStart: weekStart.toISOString(),
                themesCount: summary.keyThemes?.length || 0,
              });
            }
          }

          // Generate monthly summary on 1st of month
          if (now.getDate() === 1) {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            if (await shouldGenerateMonthlySummary(user.id, monthStart)) {
              const monthEnd = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
              );

              const summary = await generateHierarchicalSummary(
                user.id,
                monthStart,
                monthEnd,
              );

              if (summary) {
                await prisma.hierarchicalSummary.create({
                  data: {
                    userId: user.id,
                    type: "monthly",
                    startDate: monthStart,
                    endDate: monthEnd,
                    keyThemes: summary.keyThemes || [],
                    consolidatedLearnings: summary.consolidatedLearnings || [],
                    frequentTopics: summary.frequentTopics || [],
                    sourceConversationIds: summary.sourceConversationIds || [],
                  },
                });

                logger.info("Monthly summary created", {
                  userId: user.id,
                  periodStart: monthStart.toISOString(),
                  themesCount: summary.keyThemes?.length || 0,
                });
              }
            }
          }
        } catch (error) {
          logger.error("Failed to process user summarization", {
            userId: user.id,
            error: String(error),
          });
          // Continue processing other users
          continue;
        }
      }
    }

    logger.info("Hierarchical summarization completed", {
      processedUsers: usersWithConversations.length,
      duration: new Date().getTime() - now.getTime(),
    });
  } catch (error) {
    logger.error("Hierarchical summarization failed", {
      error: String(error),
    });
    throw error;
  }
}
