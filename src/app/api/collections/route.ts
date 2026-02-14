// ============================================================================
// API ROUTE: Collections (Material Folders)
// GET: List user's collections
// POST: Create new collection
// ADR: 0022-knowledge-hub-material-organization.md
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma, isDatabaseNotInitialized } from "@/lib/db";
import { logger } from "@/lib/logger";
import { CreateCollectionSchema } from "@/lib/validation/schemas/organization";

/**
 * GET /api/collections
 *
 * Returns all collections for the current user.
 * Optionally filtered by parentId for nested navigation.
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/collections"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  try {
    // 2. Parse query params
    const { searchParams } = new URL(ctx.req.url);
    const parentId = searchParams.get("parentId") || undefined;
    const includeChildren = searchParams.get("includeChildren") === "true";

    // 3. Pagination params (defaults: page=1, limit=100, max=500)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "100", 10)),
    );
    const skip = (page - 1) * limit;

    // 4. Fetch collections
    const where = {
      userId,
      ...(parentId ? { parentId } : { parentId: null }),
    };

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip,
        take: limit,
        include: {
          ...(includeChildren && {
            children: {
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            },
          }),
          _count: {
            select: { materials: true },
          },
        },
      }),
      prisma.collection.count({ where }),
    ]);

    logger.info("Collections GET", {
      userId,
      count: collections.length,
      page,
      total,
      parentId: parentId ?? "root",
    });

    return NextResponse.json({
      data: collections,
      pagination: {
        total,
        page,
        limit,
        hasNext: skip + collections.length < total,
      },
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
 * POST /api/collections
 *
 * Create a new collection for the current user.
 */
export const POST = pipe(
  withSentry("/api/collections"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // 2. Validate input
  const body = await ctx.req.json();
  const validation = CreateCollectionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: validation.error.issues.map((e) => e.message),
      },
      { status: 400 },
    );
  }

  const { name, description, color, icon, parentId, sortOrder } =
    validation.data;

  // 3. If parentId provided, verify it belongs to user
  if (parentId) {
    const parent = await prisma.collection.findFirst({
      where: { id: parentId, userId },
    });
    if (!parent) {
      return NextResponse.json(
        { error: "Parent collection not found" },
        { status: 404 },
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

  logger.info("Collection created", {
    userId,
    collectionId: collection.id,
    name: collection.name,
  });

  return NextResponse.json(collection, { status: 201 });
});
