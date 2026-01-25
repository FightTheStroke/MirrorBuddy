// ============================================================================
// PROGRESS MANAGER
// Handle learning path progression and topic unlocking
// Plan 8 MVP - Wave 2: Learning Path Generation [F-14]
// ============================================================================

import { prisma } from "@/lib/db";
import type { LearningPathTopic } from "@prisma/client";
import { logger } from "@/lib/logger";

/**
 * Topic status values
 */
export type TopicStatus = "locked" | "unlocked" | "in_progress" | "completed";

/**
 * Result of completing a topic
 */
export interface TopicCompletionResult {
  topicId: string;
  newStatus: TopicStatus;
  quizScore?: number;
  unlockedNext: boolean;
  nextTopicId?: string;
  pathProgress: number;
  pathCompleted: boolean;
}

/**
 * Start a topic (mark as in_progress)
 * [F-14] Progressive unlock
 */
export async function startTopic(
  topicId: string,
): Promise<{ success: boolean; error?: string }> {
  logger.info("Starting topic", { topicId });

  const topic = await prisma.learningPathTopic.findUnique({
    where: { id: topicId },
  });

  if (!topic) {
    return { success: false, error: "Topic not found" };
  }

  if (topic.status === "locked") {
    return { success: false, error: "Topic is locked" };
  }

  if (topic.status === "completed") {
    return { success: false, error: "Topic already completed" };
  }

  await prisma.learningPathTopic.update({
    where: { id: topicId },
    data: {
      status: "in_progress",
      startedAt: new Date(),
    },
  });

  logger.info("Topic started", { topicId });
  return { success: true };
}

/**
 * Complete a topic and unlock the next one
 * [F-14] Progressive unlock
 */
export async function completeTopic(
  topicId: string,
  quizScore?: number,
): Promise<TopicCompletionResult> {
  logger.info("Completing topic", { topicId, quizScore });

  // Use transaction to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // Get topic and path info
    const topic = await tx.learningPathTopic.findUnique({
      where: { id: topicId },
      include: {
        path: {
          include: {
            topics: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new Error("Topic not found");
    }

    if (topic.status === "locked") {
      throw new Error("Cannot complete a locked topic");
    }

    // Mark topic as completed
    await tx.learningPathTopic.update({
      where: { id: topicId },
      data: {
        status: "completed",
        completedAt: new Date(),
        quizScore: quizScore ?? null,
      },
    });

    // Find next topic
    const currentOrder = topic.order;
    const nextTopic = topic.path.topics.find(
      (t) => t.order === currentOrder + 1,
    );
    let unlockedNext = false;
    let nextTopicId: string | undefined;

    // Unlock next topic if exists and is locked
    if (nextTopic && nextTopic.status === "locked") {
      await tx.learningPathTopic.update({
        where: { id: nextTopic.id },
        data: { status: "unlocked" },
      });
      unlockedNext = true;
      nextTopicId = nextTopic.id;
      logger.info("Next topic unlocked", { nextTopicId });
    }

    // Calculate new progress
    const completedCount =
      topic.path.topics.filter((t) => t.status === "completed").length + 1;
    const totalCount = topic.path.topics.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);
    const pathCompleted = completedCount === totalCount;

    // Update path progress
    await tx.learningPath.update({
      where: { id: topic.pathId },
      data: {
        completedTopics: completedCount,
        progressPercent,
        status: pathCompleted ? "completed" : "in_progress",
        completedAt: pathCompleted ? new Date() : null,
      },
    });

    logger.info("Topic completed", {
      topicId,
      progressPercent,
      pathCompleted,
      unlockedNext,
    });

    return {
      topicId,
      newStatus: "completed" as const,
      quizScore,
      unlockedNext,
      nextTopicId,
      pathProgress: progressPercent,
      pathCompleted,
    };
  });
}

/**
 * Get learning path progress summary
 */
export async function getPathProgress(pathId: string): Promise<{
  totalTopics: number;
  completedTopics: number;
  currentTopic: string | null;
  progressPercent: number;
  isCompleted: boolean;
}> {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      topics: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!path) {
    throw new Error("Path not found");
  }

  const currentTopic = path.topics.find(
    (t: LearningPathTopic) =>
      t.status === "in_progress" || t.status === "unlocked",
  );

  return {
    totalTopics: path.totalTopics,
    completedTopics: path.completedTopics,
    currentTopic: currentTopic?.id ?? null,
    progressPercent: path.progressPercent,
    isCompleted: path.status === "completed",
  };
}

/**
 * Reset a topic to unlocked state (for re-studying)
 */
export async function resetTopic(
  topicId: string,
): Promise<{ success: boolean }> {
  logger.info("Resetting topic", { topicId });

  const topic = await prisma.learningPathTopic.findUnique({
    where: { id: topicId },
  });

  if (!topic || topic.status === "locked") {
    return { success: false };
  }

  await prisma.learningPathTopic.update({
    where: { id: topicId },
    data: {
      status: "unlocked",
      startedAt: null,
      completedAt: null,
      quizScore: null,
    },
  });

  return { success: true };
}
