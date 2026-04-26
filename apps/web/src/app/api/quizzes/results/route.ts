// ============================================================================
// API ROUTE: Quiz results
// GET: Get quiz results history
// POST: Save new quiz result
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { QuizResult } from "@prisma/client";
import { recordAdaptiveSignal } from "@/lib/education/server";
import type { AdaptiveSignalSource } from "@/types";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/quizzes/results"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
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
});

export const POST = pipe(
  withSentry("/api/quizzes/results"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const data = await ctx.req.json();

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
});
