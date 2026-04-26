/**
 * API Route: Learning Path
 * List and create learning paths
 * Plan 8 MVP - Wave 3: Progress Tracking [F-15]
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { CreateLearningPathSchema } from "@/lib/validation/schemas/learning-path";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

/**
 * GET /api/learning-path
 * List all learning paths for the current user
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/learning-path"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const paths = await prisma.learningPath.findMany({
    where: { userId },
    include: {
      topics: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          status: true,
          difficulty: true,
          quizScore: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ paths });
});

/**
 * POST /api/learning-path
 * Create a new learning path (usually from study kit)
 */
export const POST = pipe(
  withSentry("/api/learning-path"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();

  // Validate with Zod schema
  const validation = CreateLearningPathSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid learning path data",
        details: validation.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const { title, subject, sourceStudyKitId, topics, visualOverview } =
    validation.data;

  // Create path with topics
  const path = await prisma.learningPath.create({
    data: {
      userId,
      title,
      subject,
      sourceStudyKitId,
      totalTopics: topics.length,
      completedTopics: 0,
      progressPercent: 0,
      status: "ready",
      visualOverview,
      topics: {
        create: topics.map((topic, index) => ({
          order: topic.order || index + 1,
          title: topic.title,
          description: topic.description || "",
          keyConcepts: JSON.stringify(topic.keyConcepts || []),
          difficulty: topic.difficulty || "intermediate",
          status: index === 0 ? "unlocked" : "locked",
        })),
      },
    },
    include: {
      topics: {
        orderBy: { order: "asc" },
      },
    },
  });

  logger.info("Learning path created", {
    pathId: path.id,
    topicCount: topics.length,
  });

  return NextResponse.json({ path }, { status: 201 });
});
