// ============================================================================
// API ROUTE: Flashcard progress (FSRS algorithm state)
// GET: Get all flashcard progress for user
// POST: Create or update flashcard progress
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get('deckId');
    const dueOnly = searchParams.get('due') === 'true';

    const where: Record<string, unknown> = { userId };
    if (deckId) where.deckId = deckId;
    if (dueOnly) {
      where.nextReview = { lte: new Date() };
    }

    const progress = await prisma.flashcardProgress.findMany({
      where,
      orderBy: { nextReview: 'asc' },
    });

    return NextResponse.json(progress);
  } catch (error) {
    logger.error('Flashcard progress GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get flashcard progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.cardId) {
      return NextResponse.json(
        { error: 'cardId is required' },
        { status: 400 }
      );
    }

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
        state: data.state ?? 'new',
        reps: data.reps ?? 0,
        lapses: data.lapses ?? 0,
        lastReview: data.lastReview ? new Date(data.lastReview) : null,
        nextReview: data.nextReview ? new Date(data.nextReview) : null,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    logger.error('Flashcard progress POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to save flashcard progress' },
      { status: 500 }
    );
  }
}
