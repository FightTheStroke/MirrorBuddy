// ============================================================================
// API ROUTE: Single Tag Operations
// GET: Get tag details with materials
// PUT: Update tag
// DELETE: Delete tag
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Zod schema for update validation
const UpdateTagSchema = z.object({
  name: z.string().min(1).max(50).transform(s => s.toLowerCase().trim()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/tags/[id]
 *
 * Get a single tag with its materials.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tag = await prisma.tag.findFirst({
      where: { id, userId },
      include: {
        materials: {
          include: {
            material: {
              select: {
                id: true,
                toolType: true,
                title: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: {
          select: { materials: true },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Flatten materials for easier consumption
    const response = {
      ...tag,
      materials: tag.materials.map((mt: {
        material: { id: string; toolType: string; title: string | null; createdAt: Date };
      }) => mt.material),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Tag GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch tag' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tags/[id]
 *
 * Update a tag.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Validate input
    const body = await request.json();
    const validation = UpdateTagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues.map(e => e.message),
        },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: validation.data,
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });

    logger.info('Tag updated', { userId, tagId: id });

    return NextResponse.json(tag);
  } catch (error) {
    logger.error('Tag PUT error', { error: String(error) });

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
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tags/[id]
 *
 * Delete a tag. MaterialTag relations are cascade deleted.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    await prisma.tag.delete({
      where: { id },
    });

    logger.info('Tag deleted', { userId, tagId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Tag DELETE error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
