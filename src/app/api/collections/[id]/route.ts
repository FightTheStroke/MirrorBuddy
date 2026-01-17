// ============================================================================
// API ROUTE: Single Collection Operations
// GET: Get collection details
// PUT: Update collection
// DELETE: Delete collection
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { UpdateCollectionSchema } from "@/lib/validation/schemas/organization";
import { requireCSRF } from "@/lib/security/csrf";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/collections/[id]
 *
 * Get a single collection with its materials.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await validateAuth();
    const { id } = await params;

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    const collection = await prisma.collection.findFirst({
      where: { id, userId },
      include: {
        children: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        materials: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: { materials: true, children: true },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(collection);
  } catch (error) {
    logger.error("Collection GET error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/collections/[id]
 *
 * Update a collection.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    const { id } = await params;

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    // Verify ownership
    const existing = await prisma.collection.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 },
      );
    }

    // Validate input
    const body = await request.json();
    const validation = UpdateCollectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.issues.map((e) => e.message),
        },
        { status: 400 },
      );
    }

    // Prevent circular parent reference
    if (validation.data.parentId === id) {
      return NextResponse.json(
        { error: "Collection cannot be its own parent" },
        { status: 400 },
      );
    }

    // If changing parent, verify new parent belongs to user
    if (validation.data.parentId) {
      const parent = await prisma.collection.findFirst({
        where: { id: validation.data.parentId, userId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent collection not found" },
          { status: 404 },
        );
      }
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: validation.data,
      include: {
        _count: {
          select: { materials: true },
        },
      },
    });

    logger.info("Collection updated", {
      userId,
      collectionId: id,
    });

    return NextResponse.json(collection);
  } catch (error) {
    logger.error("Collection PUT error", { error: String(error) });

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A collection with this name already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/collections/[id]
 *
 * Delete a collection.
 * Materials in this collection will have their collectionId set to null.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAuth();
    const { id } = await params;

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    // Verify ownership
    const existing = await prisma.collection.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { children: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 },
      );
    }

    // Check for children
    if (existing._count.children > 0) {
      return NextResponse.json(
        { error: "Cannot delete collection with sub-collections" },
        { status: 400 },
      );
    }

    // Remove collection (materials will have collectionId set to null via Prisma)
    await prisma.collection.delete({
      where: { id },
    });

    logger.info("Collection deleted", {
      userId,
      collectionId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Collection DELETE error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 },
    );
  }
}
