// ============================================================================
// API ROUTE: Single Tag Operations
// GET: Get tag details with materials
// PUT: Update tag
// DELETE: Delete tag
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { UpdateTagSchema } from "@/lib/validation/schemas/organization";

/**
 * GET /api/tags/[id]
 *
 * Get a single tag with its materials.
 */
export const GET = pipe(
  withSentry("/api/tags/:id"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

  const tag = await prisma.tag.findFirst({
    where: { id, userId },
    include: {
      materials: {
        include: {
          material: {
            select: {
              id: true,
              toolType: true,
              title: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: {
        select: { materials: true },
      },
    },
  });

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  // Flatten materials for easier consumption
  const response = {
    ...tag,
    materials: tag.materials.map((mt) => mt.material),
  };

  return NextResponse.json(response);
});

/**
 * PUT /api/tags/[id]
 *
 * Update a tag.
 */
export const PUT = pipe(
  withSentry("/api/tags/:id"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

  // Verify ownership
  const existing = await prisma.tag.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  // Validate input
  const body = await ctx.req.json();
  const validation = UpdateTagSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: validation.error.issues.map((e) => e.message),
      },
      { status: 400 },
    );
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: validation.data,
    include: {
      _count: {
        select: { materials: true },
      },
    },
  });

  logger.info("Tag updated", { userId, tagId: id });

  return NextResponse.json(tag);
});

/**
 * DELETE /api/tags/[id]
 *
 * Delete a tag. MaterialTag relations are cascade deleted.
 */
export const DELETE = pipe(
  withSentry("/api/tags/:id"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id } = await ctx.params;

  // Verify ownership
  const existing = await prisma.tag.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  await prisma.tag.delete({
    where: { id },
  });

  logger.info("Tag deleted", { userId, tagId: id });

  return NextResponse.json({ success: true });
});
