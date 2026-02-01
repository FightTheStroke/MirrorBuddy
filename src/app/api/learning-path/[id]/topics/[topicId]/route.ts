/**
 * API Route: Learning Path Topic Status
 * Update topic status and progress
 * Plan 8 MVP - Wave 3: Progress Tracking [F-15]
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

type TopicStatus = "locked" | "unlocked" | "in_progress" | "completed";

interface UpdateTopicRequest {
  status?: TopicStatus;
  quizScore?: number;
}

/**
 * GET /api/learning-path/[id]/topics/[topicId]
 * Get topic details with attempts
 */
export const GET = pipe(
  withSentry("/api/learning-path/[id]/topics/[topicId]"),
  withAuth,
)(async (ctx) => {
  const { id, topicId } = await ctx.params;
  const userId = ctx.userId!;

  const topic = await prisma.learningPathTopic.findUnique({
    where: { id: topicId },
    include: {
      path: true,
      steps: { orderBy: { order: "asc" } },
      attempts: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!topic || topic.pathId !== id) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (topic.path.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ topic });
});

/**
 * PATCH /api/learning-path/[id]/topics/[topicId]
 * Update topic status (start, complete, etc.)
 */
export const PATCH = pipe(
  withSentry("/api/learning-path/[id]/topics/[topicId]"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id, topicId } = await ctx.params;
  const userId = ctx.userId!;

  const body: UpdateTopicRequest = await ctx.req.json();
  const { status, quizScore } = body;

  // Input validation
  const validStatuses: TopicStatus[] = [
    "locked",
    "unlocked",
    "in_progress",
    "completed",
  ];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 },
    );
  }
  if (
    quizScore !== undefined &&
    (typeof quizScore !== "number" || quizScore < 0 || quizScore > 100)
  ) {
    return NextResponse.json(
      { error: "Quiz score must be a number between 0 and 100" },
      { status: 400 },
    );
  }

  // Get topic with path
  const topic = await prisma.learningPathTopic.findUnique({
    where: { id: topicId },
    include: {
      path: {
        include: {
          topics: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!topic || topic.pathId !== id) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (topic.path.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate status transition
  if (status) {
    if (topic.status === "locked" && status !== "unlocked") {
      return NextResponse.json(
        { error: "Cannot change locked topic status" },
        { status: 400 },
      );
    }
  }

  // Build update data
  const updateData: {
    status?: TopicStatus;
    quizScore?: number;
    startedAt?: Date;
    completedAt?: Date;
  } = {};

  if (status) {
    updateData.status = status;

    if (status === "in_progress" && !topic.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === "completed") {
      updateData.completedAt = new Date();
    }
  }

  if (quizScore !== undefined) {
    updateData.quizScore = quizScore;
  }

  // Update topic
  const updatedTopic = await prisma.learningPathTopic.update({
    where: { id: topicId },
    data: updateData,
  });

  // If completing, unlock next topic and update path progress
  let unlockedNext = false;
  let nextTopicId: string | null = null;

  if (status === "completed") {
    const nextTopic = topic.path.topics.find(
      (t) => t.order === topic.order + 1,
    );

    if (nextTopic && nextTopic.status === "locked") {
      await prisma.learningPathTopic.update({
        where: { id: nextTopic.id },
        data: { status: "unlocked" },
      });
      unlockedNext = true;
      nextTopicId = nextTopic.id;
    }

    // Update path progress
    const completedCount =
      topic.path.topics.filter((t) => t.status === "completed").length + 1;
    const progressPercent = Math.round(
      (completedCount / topic.path.topics.length) * 100,
    );
    const pathCompleted = completedCount === topic.path.topics.length;

    await prisma.learningPath.update({
      where: { id: topic.pathId },
      data: {
        completedTopics: completedCount,
        progressPercent,
        status: pathCompleted ? "completed" : "in_progress",
        completedAt: pathCompleted ? new Date() : null,
      },
    });
  }

  logger.info("Topic status updated", {
    topicId,
    oldStatus: topic.status,
    newStatus: status || topic.status,
    unlockedNext,
  });

  return NextResponse.json({
    topic: updatedTopic,
    unlockedNext,
    nextTopicId,
  });
});
