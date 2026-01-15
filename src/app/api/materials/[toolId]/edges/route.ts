/**
 * Material Edges API - Knowledge Graph relationships
 * Wave 3: GET, POST, DELETE edges for a material
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const EdgeCreateSchema = z.object({
  toId: z.string().min(1),
  relationType: z.enum(['derived_from', 'related_to', 'prerequisite', 'extends']),
  weight: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = { params: Promise<{ toolId: string }> };

/**
 * GET /api/materials/[toolId]/edges
 * Get all edges connected to this material (both from and to)
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { toolId } = await context.params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find material by toolId
    const material = await prisma.material.findUnique({
      where: { toolId },
      select: { id: true, userId: true },
    });

    if (!material || material.userId !== userId) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    const edges = await prisma.materialEdge.findMany({
      where: {
        OR: [{ fromId: material.id }, { toId: material.id }],
      },
      include: {
        from: { select: { id: true, toolId: true, title: true, toolType: true } },
        to: { select: { id: true, toolId: true, title: true, toolType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ edges });
  } catch (error) {
    logger.error('Failed to fetch edges', { error, toolId: (await context.params).toolId });
    return NextResponse.json(
      { error: 'Failed to fetch edges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials/[toolId]/edges
 * Create a new edge from this material to another
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { toolId } = await context.params;
    const body = await request.json();
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = EdgeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Find source material
    const fromMaterial = await prisma.material.findUnique({
      where: { toolId },
      select: { id: true, userId: true },
    });

    if (!fromMaterial || fromMaterial.userId !== userId) {
      return NextResponse.json(
        { error: 'Source material not found' },
        { status: 404 }
      );
    }

    // Find target material
    const toMaterial = await prisma.material.findUnique({
      where: { toolId: parsed.data.toId },
      select: { id: true, userId: true },
    });

    if (!toMaterial || toMaterial.userId !== userId) {
      return NextResponse.json(
        { error: 'Target material not found' },
        { status: 404 }
      );
    }

    // Create edge
    const edge = await prisma.materialEdge.create({
      data: {
        fromId: fromMaterial.id,
        toId: toMaterial.id,
        relationType: parsed.data.relationType,
        weight: parsed.data.weight ?? 1.0,
        metadata: parsed.data.metadata as object | undefined,
      },
      include: {
        from: { select: { id: true, toolId: true, title: true, toolType: true } },
        to: { select: { id: true, toolId: true, title: true, toolType: true } },
      },
    });

    return NextResponse.json({ edge }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Edge already exists' },
        { status: 409 }
      );
    }

    logger.error('Failed to create edge', { error, toolId: (await context.params).toolId });
    return NextResponse.json(
      { error: 'Failed to create edge' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[toolId]/edges
 * Delete an edge (requires toId and relationType in query params)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { toolId } = await context.params;
    const { searchParams } = new URL(request.url);
    const toToolId = searchParams.get('toId');
    const relationType = searchParams.get('relationType');
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!toToolId || !relationType) {
      return NextResponse.json(
        { error: 'Missing toId or relationType query params' },
        { status: 400 }
      );
    }

    // Find both materials
    const [fromMaterial, toMaterial] = await Promise.all([
      prisma.material.findUnique({ where: { toolId }, select: { id: true, userId: true } }),
      prisma.material.findUnique({ where: { toolId: toToolId }, select: { id: true, userId: true } }),
    ]);

    if (!fromMaterial || !toMaterial || fromMaterial.userId !== userId || toMaterial.userId !== userId) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    await prisma.materialEdge.delete({
      where: {
        fromId_toId_relationType: {
          fromId: fromMaterial.id,
          toId: toMaterial.id,
          relationType,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete edge', { error, toolId: (await context.params).toolId });
    return NextResponse.json(
      { error: 'Failed to delete edge' },
      { status: 500 }
    );
  }
}
