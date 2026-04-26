// ============================================================================
// API ROUTE: Tags
// GET: List user's tags
// POST: Create new tag
// ADR: 0022-knowledge-hub-material-organization.md
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma, isDatabaseNotInitialized } from "@/lib/db";
import { logger } from "@/lib/logger";
import { CreateTagSchema } from "@/lib/validation/schemas/organization";

/**
 * GET /api/tags
 *
 * Returns all tags for the current user with material counts.
 * Supports pagination via ?page=1&limit=100 (max 500)
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/tags"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  try {
    // 2. Pagination params (defaults: page=1, limit=100, max=500)
    const { searchParams } = new URL(ctx.req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "100", 10)),
    );
    const skip = (page - 1) * limit;

    // 3. Fetch tags with counts
    const where = { userId };
    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: { materials: true },
          },
        },
      }),
      prisma.tag.count({ where }),
    ]);

    logger.info("Tags GET", { userId, count: tags.length, page, total });

    return NextResponse.json({
      data: tags,
      pagination: { total, page, limit, hasNext: skip + tags.length < total },
    });
  } catch (error) {
    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 503 },
      );
    }
    throw error;
  }
});

/**
 * POST /api/tags
 *
 * Create a new tag for the current user.
 */
export const POST = pipe(
  withSentry("/api/tags"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // 2. Validate input
  const body = await ctx.req.json();
  const validation = CreateTagSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: validation.error.issues.map((e) => e.message),
      },
      { status: 400 },
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

  logger.info("Tag created", { userId, tagId: tag.id, name: tag.name });

  return NextResponse.json(tag, { status: 201 });
});
