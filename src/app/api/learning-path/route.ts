/**
 * API Route: Learning Path
 * List and create learning paths
 * Plan 8 MVP - Wave 3: Progress Tracking [F-15]
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { CreateLearningPathSchema } from "@/lib/validation/schemas/learning-path";
import { requireCSRF } from "@/lib/security/csrf";

/**
 * GET /api/learning-path
 * List all learning paths for the current user
 */
export async function GET() {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

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
  } catch (error) {
    logger.error("Failed to fetch learning paths", undefined, error);
    return NextResponse.json(
      { error: "Failed to fetch learning paths" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/learning-path
 * Create a new learning path (usually from study kit)
 */
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    const body = await request.json();

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
  } catch (error) {
    logger.error("Failed to create learning path", undefined, error);
    return NextResponse.json(
      { error: "Failed to create learning path" },
      { status: 500 },
    );
  }
}
