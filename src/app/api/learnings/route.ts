// ============================================================================
// API ROUTE: Learnings (cross-session insights)
// GET: Get all learnings for user
// POST: Create new learning
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
    const category = searchParams.get('category');
    const maestroId = searchParams.get('maestroId');
    const subject = searchParams.get('subject');
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');

    const learnings = await prisma.learning.findMany({
      where: {
        userId,
        ...(category && { category }),
        ...(maestroId && { maestroId }),
        ...(subject && { subject }),
        confidence: { gte: minConfidence },
      },
      orderBy: { confidence: 'desc' },
    });

    return NextResponse.json(learnings);
  } catch (error) {
    logger.error('Learnings GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get learnings' },
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

    if (!data.category || !data.insight) {
      return NextResponse.json(
        { error: 'category and insight are required' },
        { status: 400 }
      );
    }

    // Check for similar existing learning to reinforce
    const existing = await prisma.learning.findFirst({
      where: {
        userId,
        category: data.category,
        insight: {
          contains: data.insight.slice(0, 30),
        },
      },
    });

    if (existing) {
      // Reinforce existing learning
      const updated = await prisma.learning.update({
        where: { id: existing.id },
        data: {
          confidence: Math.min(1, existing.confidence + 0.1),
          occurrences: existing.occurrences + 1,
        },
      });
      return NextResponse.json({ ...updated, reinforced: true });
    }

    // Create new learning
    const learning = await prisma.learning.create({
      data: {
        userId,
        category: data.category,
        insight: data.insight,
        maestroId: data.maestroId,
        subject: data.subject,
        confidence: data.confidence ?? 0.5,
      },
    });

    return NextResponse.json({ ...learning, reinforced: false });
  } catch (error) {
    logger.error('Learnings POST error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to create learning' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a learning
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.learning.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Learning not found' },
        { status: 404 }
      );
    }

    await prisma.learning.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Learnings DELETE error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete learning' },
      { status: 500 }
    );
  }
}
