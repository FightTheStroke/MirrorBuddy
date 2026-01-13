// ============================================================================
// API ROUTE: Tags
// GET: List user's tags
// POST: Create new tag
// ADR: 0022-knowledge-hub-material-organization.md
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, isDatabaseNotInitialized } from '@/lib/db';
import { logger } from '@/lib/logger';
import { CreateTagSchema } from '@/lib/validation/schemas/organization';

/**
 * GET /api/tags
 *
 * Returns all tags for the current user with material counts.
 */
export async function GET() {
  try {
    // 1. Auth check
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch tags with counts
    const tags = await prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });

    logger.info('Tags GET', { userId, count: tags.length });

    return NextResponse.json(tags);
  } catch (error) {
    logger.error('Tags GET error', { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags
 *
 * Create a new tag for the current user.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate input
    const body = await request.json();
    const validation = CreateTagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues.map(e => e.message),
        },
        { status: 400 }
      );
    }

    const { name, color } = validation.data;

    // 3. Create tag
    const tag = await prisma.tag.create({
      data: {
        userId,
        name,
        color,
      },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });

    logger.info('Tag created', { userId, tagId: tag.id, name: tag.name });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    logger.error('Tags POST error', { error: String(error) });

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
