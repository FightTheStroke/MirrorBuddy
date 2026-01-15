/**
 * Material Concepts API - Knowledge Graph concept links
 * Wave 3: GET, POST, DELETE concept links for a material
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ConceptLinkSchema = z.object({
  conceptId: z.string().min(1),
  relevance: z.number().min(0).max(1).optional().default(1.0),
});

type RouteContext = { params: Promise<{ toolId: string }> };

/**
 * GET /api/materials/[toolId]/concepts
 * Get all concepts linked to this material
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

    const concepts = await prisma.materialConcept.findMany({
      where: { materialId: material.id },
      include: {
        concept: {
          select: {
            id: true,
            name: true,
            description: true,
            subject: true,
          },
        },
      },
      orderBy: { relevance: 'desc' },
    });

    return NextResponse.json({
      concepts: concepts.map((mc) => ({
        ...mc.concept,
        relevance: mc.relevance,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch concepts', { error, toolId: (await context.params).toolId });
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials/[toolId]/concepts
 * Link a concept to this material
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

    const parsed = ConceptLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

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

    // Verify concept exists
    const concept = await prisma.concept.findUnique({
      where: { id: parsed.data.conceptId, userId },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    // Create or update link
    const link = await prisma.materialConcept.upsert({
      where: {
        materialId_conceptId: {
          materialId: material.id,
          conceptId: parsed.data.conceptId,
        },
      },
      create: {
        materialId: material.id,
        conceptId: parsed.data.conceptId,
        relevance: parsed.data.relevance,
      },
      update: {
        relevance: parsed.data.relevance,
      },
      include: {
        concept: {
          select: { id: true, name: true, description: true, subject: true },
        },
      },
    });

    return NextResponse.json(
      {
        concept: {
          ...link.concept,
          relevance: link.relevance,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to link concept', { error, toolId: (await context.params).toolId });
    return NextResponse.json(
      { error: 'Failed to link concept' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[toolId]/concepts
 * Unlink a concept from this material (conceptId in query params)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { toolId } = await context.params;
    const { searchParams } = new URL(request.url);
    const conceptId = searchParams.get('conceptId');
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!conceptId) {
      return NextResponse.json(
        { error: 'Missing conceptId query param' },
        { status: 400 }
      );
    }

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

    const concept = await prisma.concept.findUnique({
      where: { id: conceptId, userId },
      select: { id: true },
    });

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    await prisma.materialConcept.delete({
      where: {
        materialId_conceptId: {
          materialId: material.id,
          conceptId: concept.id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to unlink concept', { error, toolId: (await context.params).toolId });
    return NextResponse.json(
      { error: 'Failed to unlink concept' },
      { status: 500 }
    );
  }
}
