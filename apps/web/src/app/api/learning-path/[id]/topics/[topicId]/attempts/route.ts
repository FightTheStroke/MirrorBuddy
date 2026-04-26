/**
 * API Route: Topic Quiz Attempts
 * Save and retrieve quiz attempts for a topic
 * Plan 8 MVP - Wave 3: Progress Tracking [F-17]
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";


export const revalidate = 0;
interface CreateAttemptRequest {
  type?: "quiz" | "study" | "review";
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  answers?: number[];
  durationSeconds?: number;
}

/**
 * GET /api/learning-path/[id]/topics/[topicId]/attempts
 * Get quiz attempts history for a topic
 */
export const GET = pipe(
  withSentry("/api/learning-path/[id]/topics/[topicId]/attempts"),
  withAuth,
)(async (ctx) => {
  const { id, topicId } = await ctx.params;
  const userId = ctx.userId!;

  // Verify topic belongs to path and user
  const topic = await prisma.learningPathTopic.findUnique({
    where: { id: topicId },
    include: { path: true },
  });

  if (!topic || topic.pathId !== id) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (topic.path.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attempts = await prisma.topicAttempt.findMany({
    where: { topicId, userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Calculate stats
  const quizAttempts = attempts.filter((a) => a.type === "quiz");
  const stats = {
    totalAttempts: quizAttempts.length,
    bestScore:
      quizAttempts.length > 0
        ? Math.max(...quizAttempts.map((a) => a.score || 0))
        : null,
    averageScore:
      quizAttempts.length > 0
        ? Math.round(
            quizAttempts.reduce((sum, a) => sum + (a.score || 0), 0) /
              quizAttempts.length,
          )
        : null,
    passedCount: quizAttempts.filter((a) => a.passed).length,
    totalTimeSeconds: attempts.reduce(
      (sum, a) => sum + (a.durationSeconds || 0),
      0,
    ),
  };

  return NextResponse.json({ attempts, stats });
});

/**
 * POST /api/learning-path/[id]/topics/[topicId]/attempts
 * Save a new quiz/study attempt
 */
export const POST = pipe(
  withSentry("/api/learning-path/[id]/topics/[topicId]/attempts"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id, topicId } = await ctx.params;
  const userId = ctx.userId!;

  const body: CreateAttemptRequest = await ctx.req.json();
  const {
    type = "quiz",
    score,
    totalQuestions,
    correctAnswers,
    answers,
    durationSeconds,
  } = body;

  // Verify topic belongs to path and user
  const topic = await prisma.learningPathTopic.findUnique({
    where: { id: topicId },
    include: { path: true },
  });

  if (!topic || topic.pathId !== id) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (topic.path.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Determine if passed (70% threshold)
  const passed = score !== undefined && score >= 70;

  // Create attempt
  const attempt = await prisma.topicAttempt.create({
    data: {
      topicId,
      userId,
      type,
      score,
      totalQuestions,
      correctAnswers,
      passed,
      completedAt: new Date(),
      durationSeconds,
      answers: answers ? JSON.stringify(answers) : null,
    },
  });

  // Update topic's quizScore if this is a quiz attempt
  if (type === "quiz" && score !== undefined) {
    await prisma.learningPathTopic.update({
      where: { id: topicId },
      data: { quizScore: score },
    });
  }

  logger.info("Quiz attempt saved", {
    attemptId: attempt.id,
    topicId,
    score,
    passed,
  });

  return NextResponse.json({ attempt, passed }, { status: 201 });
});
