/**
 * API Route: Learning Path [id]
 * Get, update, delete specific learning path
 * Plan 8 MVP - Wave 3: Progress Tracking [F-15]
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/learning-path/[id]
 * Get learning path details with all topics
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const path = await prisma.learningPath.findUnique({
      where: { id },
      include: {
        topics: {
          orderBy: { order: 'asc' },
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
            attempts: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    if (path.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ path });
  } catch (error) {
    logger.error('Failed to fetch learning path', { error });
    return NextResponse.json({ error: 'Failed to fetch learning path' }, { status: 500 });
  }
}

/**
 * DELETE /api/learning-path/[id]
 * Delete a learning path
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const path = await prisma.learningPath.findUnique({
      where: { id },
    });

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    if (path.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.learningPath.delete({
      where: { id },
    });

    logger.info('Learning path deleted', { pathId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete learning path', { error });
    return NextResponse.json({ error: 'Failed to delete learning path' }, { status: 500 });
  }
}
