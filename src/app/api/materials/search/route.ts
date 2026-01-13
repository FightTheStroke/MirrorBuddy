// ============================================================================
// MATERIALS SEARCH API
// Search endpoint for Maestri to find materials in student's archive
// Issue: Unified archive access for Maestri tools
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface SearchParams {
  query?: string;
  toolType?: string;
  subject?: string;
  userId?: string;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SearchParams;
    const { query, toolType, subject, userId, limit = 10 } = body;

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'active',
    };

    if (userId) {
      where.userId = userId;
    }

    if (toolType) {
      where.toolType = toolType;
    }

    if (subject) {
      where.subject = subject;
    }

    // Search in title and searchableText (SQLite fallback)
    // Note: PostgreSQL full-text search uses searchableTextVector derived from searchableText
    const orConditions = query ? [
      { title: { contains: query, mode: 'insensitive' as const } },
      { searchableText: { contains: query, mode: 'insensitive' as const } },
    ] : undefined;

    const materials = await prisma.material.findMany({
      where: {
        ...where,
        ...(orConditions ? { OR: orConditions } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 20), // Cap at 20
      select: {
        id: true,
        toolId: true,
        toolType: true,
        title: true,
        subject: true,
        preview: true,
        maestroId: true,
        createdAt: true,
        isBookmarked: true,
        userRating: true,
      },
    });

    logger.info('Materials search completed', {
      query,
      toolType,
      subject,
      resultsCount: materials.length,
    });

    return NextResponse.json({
      success: true,
      materials,
      totalFound: materials.length,
    });
  } catch (error) {
    logger.error('Material search failed', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Search failed', materials: [] },
      { status: 500 }
    );
  }
}

// GET for simple queries
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || undefined;
  const toolType = searchParams.get('type') || undefined;
  const subject = searchParams.get('subject') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // Reuse POST logic
  const mockRequest = {
    json: async () => ({ query, toolType, subject, userId, limit }),
  } as NextRequest;

  return POST(mockRequest);
}
