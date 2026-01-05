/**
 * API Route: Learning Path
 * List and create learning paths
 * Plan 8 MVP - Wave 3: Progress Tracking [F-15]
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/learning-path
 * List all learning paths for the current user
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paths = await prisma.learningPath.findMany({
      where: { userId },
      include: {
        topics: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            title: true,
            status: true,
            difficulty: true,
            quizScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ paths });
  } catch (error) {
    logger.error('Failed to fetch learning paths', { error });
    return NextResponse.json({ error: 'Failed to fetch learning paths' }, { status: 500 });
  }
}

/**
 * POST /api/learning-path
 * Create a new learning path (usually from study kit)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, subject, sourceStudyKitId, topics, visualOverview } = body;

    if (!title || !topics || !Array.isArray(topics)) {
      return NextResponse.json({ error: 'Title and topics required' }, { status: 400 });
    }

    // Create path with topics
    const path = await prisma.learningPath.create({
      data: {
        userId,
        title,
        subject,
        sourceStudyKitId,
        totalTopics: topics.length,
        completedTopics: 0,
        progressPercent: 0,
        status: 'ready',
        visualOverview,
        topics: {
          create: topics.map(
            (
              topic: {
                title: string;
                description: string;
                keyConcepts: string[];
                difficulty: string;
                order: number;
              },
              index: number
            ) => ({
              order: topic.order || index + 1,
              title: topic.title,
              description: topic.description || '',
              keyConcepts: JSON.stringify(topic.keyConcepts || []),
              difficulty: topic.difficulty || 'intermediate',
              status: index === 0 ? 'unlocked' : 'locked',
            })
          ),
        },
      },
      include: {
        topics: {
          orderBy: { order: 'asc' },
        },
      },
    });

    logger.info('Learning path created', { pathId: path.id, topicCount: topics.length });

    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create learning path', { error });
    return NextResponse.json({ error: 'Failed to create learning path' }, { status: 500 });
  }
}
