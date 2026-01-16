// ============================================================================
// API ROUTE: Learnings (cross-session insights)
// GET: Get all learnings for user
// POST: Create new learning
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/session-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const maestroId = searchParams.get('maestroId');
    const subject = searchParams.get('subject');
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');

    // Pagination parameters (defaults: page 1, limit 50, max 200)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const whereClause = {
      userId,
      ...(category && { category }),
      ...(maestroId && { maestroId }),
      ...(subject && { subject }),
      confidence: { gte: minConfidence },
    };

    // Get total count and paginated results in parallel
    const [total, learnings] = await Promise.all([
      prisma.learning.count({ where: whereClause }),
      prisma.learning.findMany({
        where: whereClause,
        orderBy: { confidence: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      learnings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
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
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

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
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

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
