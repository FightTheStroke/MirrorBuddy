/**
 * Concepts API - Knowledge Graph abstract concepts
 * Wave 3: GET all, POST new concept
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { z } from 'zod';

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('mirrorbuddy-user-id')?.value || null;
}

const ConceptCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subject: z.string().max(50).optional(),
});

/**
 * GET /api/concepts
 * Get all concepts for the current user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    const concepts = await prisma.concept.findMany({
      where: {
        userId,
        ...(subject ? { subject } : {}),
      },
      include: {
        _count: {
          select: { materials: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      concepts: concepts.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        subject: c.subject,
        materialCount: c._count.materials,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch concepts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/concepts
 * Create a new concept
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ConceptCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const concept = await prisma.concept.create({
      data: {
        userId,
        name: parsed.data.name,
        description: parsed.data.description,
        subject: parsed.data.subject,
      },
    });

    return NextResponse.json({ concept }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Concept with this name already exists' },
        { status: 409 }
      );
    }

    console.error('Failed to create concept:', error);
    return NextResponse.json(
      { error: 'Failed to create concept' },
      { status: 500 }
    );
  }
}
