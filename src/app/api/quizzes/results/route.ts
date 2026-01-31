// ============================================================================
// API ROUTE: Quiz results
// GET: Get quiz results history
// POST: Save new quiz result
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { QuizResult } from "@prisma/client";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { recordAdaptiveSignal } from "@/lib/education/adaptive-difficulty";
import type { AdaptiveSignalSource } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const quizId = searchParams.get("quizId");
    const subject = searchParams.get("subject");

    const results = await prisma.quizResult.findMany({
      where: {
        userId,
        ...(quizId && { quizId }),
        ...(subject && { subject }),
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    });

    // Parse answers JSON
    return NextResponse.json(
      results.map((r: QuizResult) => ({
        ...r,
        answers: JSON.parse(r.answers || "[]"),
      })),
    );
  } catch (error) {
    logger.error("Quiz results GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get quiz results" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // CSRF protection
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const data = await request.json();

    if (!data.quizId || data.score === undefined || !data.totalQuestions) {
      return NextResponse.json(
        { error: "quizId, score, and totalQuestions are required" },
        { status: 400 },
      );
    }

    const percentage = (data.score / data.totalQuestions) * 100;
    const allowedSources: AdaptiveSignalSource[] = [
      "chat",
      "voice",
      "quiz",
      "flashcard",
      "summary",
      "study-kit",
    ];
    const source = allowedSources.includes(data.source) ? data.source : "quiz";

    const result = await prisma.quizResult.create({
      data: {
        userId,
        quizId: data.quizId,
        subject: data.subject,
        topic: data.topic,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage,
        avgDifficulty: data.avgDifficulty,
        source,
        answers: JSON.stringify(data.answers || []),
      },
    });

    if (data.subject) {
      await recordAdaptiveSignal(userId, {
        type: "quiz_result",
        source,
        subject: data.subject,
        topic: data.topic,
        value: Math.round(percentage),
        baselineDifficulty: data.avgDifficulty,
      });
    }

    return NextResponse.json({
      ...result,
      answers: JSON.parse(result.answers || "[]"),
    });
  } catch (error) {
    logger.error("Quiz results POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to save quiz result" },
      { status: 500 },
    );
  }
}
