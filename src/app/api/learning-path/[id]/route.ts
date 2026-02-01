/**
 * API Route: Learning Path [id]
 * Get, update, delete specific learning path
 * Plan 8 MVP - Wave 3: Progress Tracking [F-15]
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

/**
 * GET /api/learning-path/[id]
 * Get learning path details with all topics
 */
export const GET = pipe(
  withSentry("/api/learning-path/[id]"),
  withAuth,
)(async (ctx) => {
  const { id } = await ctx.params;
  const userId = ctx.userId!;

  const path = await prisma.learningPath.findUnique({
    where: { id },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: {
          steps: {
            orderBy: { order: "asc" },
          },
          attempts: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      },
    },
  });

  if (!path) {
    return NextResponse.json({ error: "Path not found" }, { status: 404 });
  }

  if (path.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ path });
});

/**
 * DELETE /api/learning-path/[id]
 * Delete a learning path
 */
export const DELETE = pipe(
  withSentry("/api/learning-path/[id]"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { id } = await ctx.params;
  const userId = ctx.userId!;

  const path = await prisma.learningPath.findUnique({
    where: { id },
  });

  if (!path) {
    return NextResponse.json({ error: "Path not found" }, { status: 404 });
  }

  if (path.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.learningPath.delete({
    where: { id },
  });

  logger.info("Learning path deleted", { pathId: id });

  return NextResponse.json({ success: true });
});
