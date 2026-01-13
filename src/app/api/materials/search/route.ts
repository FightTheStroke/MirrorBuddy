// ============================================================================
// MATERIALS SEARCH API
// Search endpoint for Maestri to find materials in student's archive
// Issue: Unified archive access for Maestri tools
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isPostgreSQL } from '@/lib/db/database-utils';
import { Prisma } from '@prisma/client';

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

    // PostgreSQL full-text search optimization
    if (query && isPostgreSQL()) {
      // Build WHERE conditions for raw SQL query
      const conditions: Prisma.Sql[] = [
        Prisma.sql`status = 'active'`,
        Prisma.sql`"searchableTextVector" @@ websearch_to_tsquery('english', ${query})`,
      ];

      if (userId) {
        conditions.push(Prisma.sql`"userId" = ${userId}`);
      }
      if (toolType) {
        conditions.push(Prisma.sql`"toolType" = ${toolType}`);
      }
      if (subject) {
        conditions.push(Prisma.sql`subject = ${subject}`);
      }

      const whereClause = Prisma.join(conditions, ' AND ');

      // Execute full-text search query with ranking
      const materials = await prisma.$queryRaw<Array<{
        id: string;
        toolId: string;
        toolType: string;
        title: string;
        subject: string | null;
        preview: string | null;
        maestroId: string | null;
        createdAt: Date;
        isBookmarked: boolean;
        userRating: number | null;
        rank: number;
      }>>`
        SELECT
          id,
          "toolId",
          "toolType",
          title,
          subject,
          preview,
          "maestroId",
          "createdAt",
          "isBookmarked",
          "userRating",
          ts_rank("searchableTextVector", websearch_to_tsquery('english', ${query})) as rank
        FROM "Material"
        WHERE ${whereClause}
        ORDER BY rank DESC, "createdAt" DESC
        LIMIT ${Math.min(limit, 20)}
      `;

      logger.info('Materials search completed (PostgreSQL full-text)', {
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
    }

    // SQLite fallback - search in title and searchableText
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

    logger.info('Materials search completed (SQLite fallback)', {
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
