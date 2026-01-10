/**
 * API Route: Single Material by toolId
 * GET /api/materials/[toolId] - Fetch material content by toolId
 *
 * Used by ToolResultDisplay to load Material content when rendering
 * messages with ToolCallRef (lightweight references without full data).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ toolId: string }>;
}

/**
 * GET /api/materials/[toolId]
 * Fetch a single material by toolId
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { toolId } = await params;

    // Auth check
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch material
    const material = await prisma.material.findUnique({
      where: { toolId },
      include: {
        collection: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (material.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Increment view count
    await prisma.material.update({
      where: { toolId },
      data: { viewCount: { increment: 1 } },
    });

    // Parse JSON content
    const parsed = {
      ...material,
      content: JSON.parse(material.content as string),
      tags: material.tags.map((mt) => mt.tag),
    };

    return NextResponse.json({ material: parsed });
  } catch (error) {
    logger.error('Failed to fetch material', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch material' },
      { status: 500 }
    );
  }
}
