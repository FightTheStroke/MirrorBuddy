// ============================================================================
// API ROUTE: Study sessions
// GET: Get recent sessions
// POST: Create new session
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
    const maestroId = searchParams.get('maestroId');

    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        ...(maestroId && { maestroId }),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    logger.error('Sessions GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get sessions' },
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

    if (!data.maestroId || !data.subject) {
      return NextResponse.json(
        { error: 'maestroId and subject are required' },
        { status: 400 }
      );
    }

    const session = await prisma.studySession.create({
      data: {
        userId,
        maestroId: data.maestroId,
        subject: data.subject,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    logger.error('Sessions POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// PATCH to end a session
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const data = await request.json();

    if (!data.id) {
      return NextResponse.json(
        { error: 'Session id is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const existingSession = await prisma.studySession.findFirst({
      where: { id: data.id, userId },
    });

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const session = await prisma.studySession.update({
      where: { id: data.id },
      data: {
        endedAt: new Date(),
        duration: data.duration,
        xpEarned: data.xpEarned,
        questions: data.questions,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    logger.error('Sessions PATCH error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
