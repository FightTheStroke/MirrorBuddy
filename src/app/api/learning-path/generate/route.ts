/**
 * API Route: Learning Path Generation
 * Generate a learning path from an existing study kit
 * Plan 8 MVP - Wave 4: UI Integration [F-21]
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { analyzeTopics } from "@/lib/learning-path/topic-analyzer";
import { findRelatedMaterials } from "@/lib/learning-path/material-linker";
import { createLearningPath } from "@/lib/learning-path/path-generator";
import { requireCSRF } from "@/lib/security/csrf";

interface GenerateRequest {
  studyKitId: string;
  includeVisualOverview?: boolean;
}

/**
 * POST /api/learning-path/generate
 * Generate a learning path from a study kit
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

    const body: GenerateRequest = await request.json();
    const { studyKitId, includeVisualOverview = true } = body;

    if (!studyKitId) {
      return NextResponse.json(
        { error: "studyKitId is required" },
        { status: 400 },
      );
    }

    // Fetch the study kit
    const studyKit = await prisma.studyKit.findUnique({
      where: { id: studyKitId },
    });

    if (!studyKit) {
      return NextResponse.json(
        { error: "Study kit not found" },
        { status: 404 },
      );
    }

    if (studyKit.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (studyKit.status !== "ready") {
      return NextResponse.json(
        {
          error:
            "Study kit is not ready. Please wait for processing to complete.",
        },
        { status: 400 },
      );
    }

    if (!studyKit.summary) {
      return NextResponse.json(
        { error: "Study kit has no summary to analyze" },
        { status: 400 },
      );
    }

    // Check if learning path already exists for this study kit
    const existingPath = await prisma.learningPath.findFirst({
      where: {
        sourceStudyKitId: studyKitId,
        userId,
      },
    });

    if (existingPath) {
      return NextResponse.json({
        path: existingPath,
        message: "Learning path already exists for this study kit",
        alreadyExists: true,
      });
    }

    logger.info("Generating learning path from study kit", {
      studyKitId,
      title: studyKit.title,
    });

    // Step 1: Analyze topics from the summary
    const analysisResult = await analyzeTopics(
      studyKit.summary,
      studyKit.title,
      studyKit.subject ?? undefined,
    );

    // Step 2: Find related materials from user's library
    const topicsWithRelations = await findRelatedMaterials(
      userId,
      analysisResult.topics,
    );

    // Step 3: Create the learning path
    const generatedPath = await createLearningPath(
      userId,
      analysisResult,
      topicsWithRelations,
      studyKitId,
      { includeVisualOverview },
    );

    logger.info("Learning path generated", {
      pathId: generatedPath.id,
      topicCount: generatedPath.topics.length,
    });

    return NextResponse.json({ path: generatedPath }, { status: 201 });
  } catch (error) {
    logger.error("Failed to generate learning path", undefined, error);
    return NextResponse.json(
      { error: "Failed to generate learning path" },
      { status: 500 },
    );
  }
}
