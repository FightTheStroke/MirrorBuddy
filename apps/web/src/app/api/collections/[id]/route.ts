// ============================================================================
// API ROUTE: Single Collection Operations
// GET: Get collection details
// PUT: Update collection
// DELETE: Delete collection
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { UpdateCollectionSchema } from "@/lib/validation/schemas/organization";

/**
 * GET /api/collections/[id]
 *
 * Get a single collection with its materials.
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/collections/:id"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

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
});

/**
 * PUT /api/collections/[id]
 *
 * Update a collection.
 */
export const PUT = pipe(
  withSentry("/api/collections/:id"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

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
  const body = await ctx.req.json();
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
});

/**
 * DELETE /api/collections/[id]
 *
 * Delete a collection.
 * Materials in this collection will have their collectionId set to null.
 */
export const DELETE = pipe(
  withSentry("/api/collections/:id"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

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
});
