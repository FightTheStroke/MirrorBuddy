// ============================================================================
// MATERIALS SEARCH API
// Search endpoint for Maestri to find materials in student's archive
// Issue: Unified archive access for Maestri tools
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isPostgreSQL } from "@/lib/db/database-utils";
import { Prisma } from "@prisma/client";


export const revalidate = 0;
interface SearchParams {
  query?: string;
  toolType?: string;
  subject?: string;
  userId?: string;
  limit?: number;
}

export const POST = pipe(
  withSentry("/api/materials/search"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  // Security: Use userId from authenticated session only
  const userId = ctx.userId!;

  const body = (await ctx.req.json()) as SearchParams;
  const { query, toolType, subject, limit = 10 } = body;

  // Build where clause (use session userId, not body userId)
  const where: Record<string, unknown> = {
    status: "active",
    userId,
  };

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

    const whereClause = Prisma.join(conditions, " AND ");

    // Execute full-text search query with ranking
    const materials = await prisma.$queryRaw<
      Array<{
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
      }>
    >`
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

    logger.info("Materials search completed (PostgreSQL full-text)", {
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
  const orConditions = query
    ? [
        { title: { contains: query, mode: "insensitive" as const } },
        { searchableText: { contains: query, mode: "insensitive" as const } },
      ]
    : undefined;

  const materials = await prisma.material.findMany({
    where: {
      ...where,
      ...(orConditions ? { OR: orConditions } : {}),
    },
    orderBy: { createdAt: "desc" },
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

  logger.info("Materials search completed (SQLite fallback)", {
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
});

// GET for simple queries
export const GET = pipe(
  withSentry("/api/materials/search"),
  withAuth,
)(async (ctx) => {
  const searchParams = ctx.req.nextUrl.searchParams;
  const query = searchParams.get("q") || undefined;
  const toolType = searchParams.get("type") || undefined;
  const subject = searchParams.get("subject") || undefined;
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  // Reuse POST logic with session userId
  const userId = ctx.userId!;

  // Build where clause (use session userId, not body userId)
  const where: Record<string, unknown> = {
    status: "active",
    userId,
  };

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

    const whereClause = Prisma.join(conditions, " AND ");

    // Execute full-text search query with ranking
    const materials = await prisma.$queryRaw<
      Array<{
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
      }>
    >`
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

    logger.info("Materials search completed (PostgreSQL full-text)", {
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
  const orConditions = query
    ? [
        { title: { contains: query, mode: "insensitive" as const } },
        { searchableText: { contains: query, mode: "insensitive" as const } },
      ]
    : undefined;

  const materials = await prisma.material.findMany({
    where: {
      ...where,
      ...(orConditions ? { OR: orConditions } : {}),
    },
    orderBy: { createdAt: "desc" },
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

  logger.info("Materials search completed (SQLite fallback)", {
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
});
