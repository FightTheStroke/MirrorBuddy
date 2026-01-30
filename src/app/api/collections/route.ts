// ============================================================================
// API ROUTE: Collections (Material Folders)
// GET: List user's collections
// POST: Create new collection
// ADR: 0022-knowledge-hub-material-organization.md
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseNotInitialized } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { CreateCollectionSchema } from "@/lib/validation/schemas/organization";
import { requireCSRF } from "@/lib/security/csrf";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/collections
 *
 * Returns all collections for the current user.
 * Optionally filtered by parentId for nested navigation.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
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
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/collections" },
    });

    logger.error("Collections GET error", { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/collections
 *
 * Create a new collection for the current user.
 */
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    // 1. Auth check
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    // 2. Validate input
    const body = await request.json();
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
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/collections" },
    });

    logger.error("Collections POST error", { error: String(error) });

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A collection with this name already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 },
    );
  }
}
