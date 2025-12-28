// ============================================================================
// API ROUTE: Quiz results
// GET: Get quiz results history
// POST: Save new quiz result
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const quizId = searchParams.get('quizId');
    const subject = searchParams.get('subject');

    const results = await prisma.quizResult.findMany({
      where: {
        userId,
        ...(quizId && { quizId }),
        ...(subject && { subject }),
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    // Parse answers JSON
    return NextResponse.json(
      results.map((r) => ({
        ...r,
        answers: JSON.parse(r.answers || '[]'),
      }))
    );
  } catch (error) {
    logger.error('Quiz results GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get quiz results' },
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

    if (!data.quizId || data.score === undefined || !data.totalQuestions) {
      return NextResponse.json(
        { error: 'quizId, score, and totalQuestions are required' },
        { status: 400 }
      );
    }

    const percentage = (data.score / data.totalQuestions) * 100;

    const result = await prisma.quizResult.create({
      data: {
        userId,
        quizId: data.quizId,
        subject: data.subject,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage,
        answers: JSON.stringify(data.answers || []),
      },
    });

    return NextResponse.json({
      ...result,
      answers: JSON.parse(result.answers || '[]'),
    });
  } catch (error) {
    logger.error('Quiz results POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to save quiz result' },
      { status: 500 }
    );
  }
}
