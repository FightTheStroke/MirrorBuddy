// ============================================================================
// API ROUTE: Autonomy Metrics (T-14) + Method Progress (Issue #28)
// GET: Calculate and return autonomy metrics for the student
// POST: Save method progress data
// Analyzes study patterns, tool usage, and learning independence
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { DEFAULT_METHOD_PROGRESS } from "@/lib/method-progress/types";
import {
  calculateStreakConsistency,
  calculateStudyTimeDistribution,
  calculateTaskCompletionRate,
  calculateFlashcardRetention,
  calculateAverageQuizScore,
  calculateMindMapsCreated,
  calculateAverageSessionDuration,
  determinePreferredStudyTime,
  calculateXpGrowthRate,
  determineImprovementTrend,
  calculateWeeklyActivity,
} from "./helpers";
import type { AutonomyMetrics } from "./types";

export async function GET(request: NextRequest) {
  try {
    // Security: Always get userId from authenticated session, never from query params
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Fetch all relevant data in parallel
    const [
      progress,
      sessions,
      flashcards,
      quizResults,
      _learnings,
      methodProgress,
    ] = await Promise.all([
      prisma.progress.findUnique({ where: { userId } }),
      prisma.studySession.findMany({
        where: {
          userId,
          startedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { startedAt: "desc" },
      }),
      prisma.flashcardProgress.findMany({ where: { userId } }),
      prisma.quizResult.findMany({
        where: {
          userId,
          completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { completedAt: "desc" },
      }),
      prisma.learning.findMany({ where: { userId } }),
      prisma.methodProgress.findUnique({ where: { userId } }),
    ]);

    // Calculate data quality based on available data
    const dataPoints = [
      sessions.length,
      flashcards.length,
      quizResults.length,
    ].filter((n) => n > 0).length;
    const dataQuality: "high" | "medium" | "low" =
      dataPoints >= 3 ? "high" : dataPoints >= 2 ? "medium" : "low";

    // Calculate self-regulation metrics
    const streakConsistency = calculateStreakConsistency(progress);
    const studyTimeDistribution = calculateStudyTimeDistribution(sessions);
    const taskCompletionRate = calculateTaskCompletionRate(sessions);

    // Calculate tool usage
    const flashcardRetention = calculateFlashcardRetention(flashcards);
    const averageQuizScore = calculateAverageQuizScore(quizResults);
    const mindMapsCreated = calculateMindMapsCreated(methodProgress);

    // Calculate learning patterns
    const avgSessionDuration = calculateAverageSessionDuration(sessions);
    const questionsPerSession =
      sessions.length > 0
        ? Math.round(
            sessions.reduce((sum, s) => sum + s.questions, 0) / sessions.length,
          )
        : 0;
    const preferredStudyTime = determinePreferredStudyTime(sessions);
    const uniqueSubjects = new Set(sessions.map((s) => s.subject)).size;
    const uniqueMaestros = new Set(sessions.map((s) => s.maestroId)).size;

    // Calculate growth indicators
    const xpGrowthRate = calculateXpGrowthRate(sessions);
    const levelProgress = progress ? ((progress.xp % 1000) / 1000) * 100 : 0;
    const improvementTrend = determineImprovementTrend(quizResults);

    // Calculate overall independence score (weighted average)
    const independenceScore = Math.round(
      streakConsistency * 0.25 +
        studyTimeDistribution * 0.2 +
        taskCompletionRate * 0.15 +
        flashcardRetention * 0.15 +
        averageQuizScore * 0.15 +
        Math.min(uniqueMaestros * 10, 100) * 0.1,
    );

    // Calculate weekly activity
    const weeklyActivity = calculateWeeklyActivity(sessions);

    const metrics: AutonomyMetrics = {
      independenceScore,
      selfRegulation: {
        streakConsistency,
        studyTimeDistribution,
        taskCompletionRate,
      },
      toolUsage: {
        flashcardsActive: flashcards.length > 0,
        flashcardRetention,
        quizParticipation: quizResults.length,
        averageQuizScore,
        mindMapsCreated,
      },
      learningPatterns: {
        averageSessionDuration: avgSessionDuration,
        questionsPerSession,
        preferredStudyTime,
        subjectsExplored: uniqueSubjects,
        maestrosUsed: uniqueMaestros,
      },
      growth: {
        xpGrowthRate,
        levelProgress: Math.round(levelProgress),
        improvementTrend,
      },
      weeklyActivity,
      lastCalculated: new Date().toISOString(),
      dataQuality,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error("Autonomy metrics GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to calculate autonomy metrics" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST: Save Method Progress (Issue #28)
// Security: userId is taken from authenticated session, not request body
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Security: Get userId from authenticated session only
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const body = await request.json();
    const {
      mindMaps,
      flashcards,
      selfAssessment,
      helpBehavior,
      methodTransfer,
      events,
      autonomyScore,
    } = body;

    // Upsert method progress
    const methodProgress = await prisma.methodProgress.upsert({
      where: { userId },
      create: {
        userId,
        mindMaps: JSON.stringify(mindMaps || DEFAULT_METHOD_PROGRESS.mindMaps),
        flashcards: JSON.stringify(
          flashcards || DEFAULT_METHOD_PROGRESS.flashcards,
        ),
        selfAssessment: JSON.stringify(
          selfAssessment || DEFAULT_METHOD_PROGRESS.selfAssessment,
        ),
        helpBehavior: JSON.stringify(
          helpBehavior || DEFAULT_METHOD_PROGRESS.helpBehavior,
        ),
        methodTransfer: JSON.stringify(
          methodTransfer || DEFAULT_METHOD_PROGRESS.methodTransfer,
        ),
        events: JSON.stringify(events || []),
        autonomyScore: autonomyScore || 0,
      },
      update: {
        mindMaps: JSON.stringify(mindMaps || DEFAULT_METHOD_PROGRESS.mindMaps),
        flashcards: JSON.stringify(
          flashcards || DEFAULT_METHOD_PROGRESS.flashcards,
        ),
        selfAssessment: JSON.stringify(
          selfAssessment || DEFAULT_METHOD_PROGRESS.selfAssessment,
        ),
        helpBehavior: JSON.stringify(
          helpBehavior || DEFAULT_METHOD_PROGRESS.helpBehavior,
        ),
        methodTransfer: JSON.stringify(
          methodTransfer || DEFAULT_METHOD_PROGRESS.methodTransfer,
        ),
        events: JSON.stringify(events || []),
        autonomyScore: autonomyScore || 0,
      },
    });

    logger.info("Method progress saved", {
      userId,
      autonomyScore: methodProgress.autonomyScore,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: methodProgress.id,
        autonomyScore: methodProgress.autonomyScore,
        updatedAt: methodProgress.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Method progress POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to save method progress" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET with userId query param: Fetch Method Progress for store sync
// ============================================================================

export async function getMethodProgress(userId: string) {
  try {
    const methodProgress = await prisma.methodProgress.findUnique({
      where: { userId },
    });

    if (!methodProgress) {
      return {
        success: true,
        data: {
          ...DEFAULT_METHOD_PROGRESS,
          userId,
        },
      };
    }

    return {
      success: true,
      data: {
        userId: methodProgress.userId,
        mindMaps: JSON.parse(methodProgress.mindMaps),
        flashcards: JSON.parse(methodProgress.flashcards),
        selfAssessment: JSON.parse(methodProgress.selfAssessment),
        helpBehavior: JSON.parse(methodProgress.helpBehavior),
        methodTransfer: JSON.parse(methodProgress.methodTransfer),
        events: JSON.parse(methodProgress.events),
        autonomyScore: methodProgress.autonomyScore,
        updatedAt: methodProgress.updatedAt,
      },
    };
  } catch (error) {
    logger.error("Get method progress error", { error: String(error), userId });
    return {
      success: false,
      error: "Failed to fetch method progress",
    };
  }
}
