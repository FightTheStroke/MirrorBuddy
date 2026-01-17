// ============================================================================
// API ROUTE: Flashcard progress (FSRS algorithm state)
// GET: Get all flashcard progress for user
// POST: Create or update flashcard progress
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import {
  FlashcardProgressGetQuerySchema,
  FlashcardProgressPostSchema,
} from "@/lib/validation/schemas/progress";
import { requireCSRF } from "@/lib/security/csrf";

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || "No user" },
        { status: 401 },
      );
    }
    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const rawDeckId = searchParams.get("deckId");
    const rawDue = searchParams.get("due");

    // Pagination params (defaults: page=1, limit=100, max=500)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "100", 10)),
    );
    const skip = (page - 1) * limit;

    // Validate query parameters
    const validation = FlashcardProgressGetQuerySchema.safeParse({
      deckId: rawDeckId || undefined,
      due: rawDue || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const { deckId, due } = validation.data;

    const where: Record<string, unknown> = { userId };
    if (deckId) where.deckId = deckId;
    if (due === "true") {
      where.nextReview = { lte: new Date() };
    }

    const [progress, total] = await Promise.all([
      prisma.flashcardProgress.findMany({
        where,
        orderBy: { nextReview: "asc" },
        skip,
        take: limit,
      }),
      prisma.flashcardProgress.count({ where }),
    ]);

    return NextResponse.json({
      data: progress,
      pagination: {
        total,
        page,
        limit,
        hasNext: skip + progress.length < total,
      },
    });
  } catch (error) {
    logger.error("Flashcard progress GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to get flashcard progress" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || "No user" },
        { status: 401 },
      );
    }
    const userId = auth.userId;

    const body = await request.json();

    // Validate request body
    const validation = FlashcardProgressPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid flashcard progress data",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Upsert flashcard progress
    const progress = await prisma.flashcardProgress.upsert({
      where: {
        userId_cardId: {
          userId,
          cardId: data.cardId,
        },
      },
      update: {
        difficulty: data.difficulty,
        stability: data.stability,
        retrievability: data.retrievability,
        state: data.state,
        reps: data.reps,
        lapses: data.lapses,
        lastReview: data.lastReview ? new Date(data.lastReview) : undefined,
        nextReview: data.nextReview ? new Date(data.nextReview) : undefined,
        deckId: data.deckId,
      },
      create: {
        userId,
        cardId: data.cardId,
        deckId: data.deckId,
        difficulty: data.difficulty ?? 0,
        stability: data.stability ?? 0,
        retrievability: data.retrievability ?? 1,
        state: data.state ?? "new",
        reps: data.reps ?? 0,
        lapses: data.lapses ?? 0,
        lastReview: data.lastReview ? new Date(data.lastReview) : null,
        nextReview: data.nextReview ? new Date(data.nextReview) : null,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    logger.error("Flashcard progress POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to save flashcard progress" },
      { status: 500 },
    );
  }
}
