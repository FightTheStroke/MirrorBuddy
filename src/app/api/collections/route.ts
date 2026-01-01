// ============================================================================
// API ROUTE: Collections (Material Folders)
// GET: List user's collections
// POST: Create new collection
// ADR: 0022-knowledge-hub-material-organization.md
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma, isDatabaseNotInitialized } from '@/lib/db';
import { logger } from '@/lib/logger';

// Zod schemas for input validation
const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().cuid().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Query params are simple booleans/strings, validated inline

/**
 * GET /api/collections
 *
 * Returns all collections for the current user.
 * Optionally filtered by parentId for nested navigation.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId') || undefined;
    const includeChildren = searchParams.get('includeChildren') === 'true';

    // 3. Fetch collections
    const collections = await prisma.collection.findMany({
      where: {
        userId,
        ...(parentId ? { parentId } : { parentId: null }),
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      include: {
        ...(includeChildren && {
          children: {
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        }),
        _count: {
          select: { materials: true },
        },
      },
    });

    logger.info('Collections GET', {
      userId,
      count: collections.length,
      parentId: parentId ?? 'root',
    });

    return NextResponse.json(collections);
  } catch (error) {
    logger.error('Collections GET error', { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections
 *
 * Create a new collection for the current user.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate input
    const body = await request.json();
    const validation = CreateCollectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues.map(e => e.message),
        },
        { status: 400 }
      );
    }

    const { name, description, color, icon, parentId, sortOrder } = validation.data;

    // 3. If parentId provided, verify it belongs to user
    if (parentId) {
      const parent = await prisma.collection.findFirst({
        where: { id: parentId, userId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent collection not found' },
          { status: 404 }
        );
      }
    }

    // 4. Create collection
    const collection = await prisma.collection.create({
      data: {
        userId,
        name,
        description,
        color,
        icon,
        parentId,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });

    logger.info('Collection created', {
      userId,
      collectionId: collection.id,
      name: collection.name,
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    logger.error('Collections POST error', { error: String(error) });

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'A collection with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
