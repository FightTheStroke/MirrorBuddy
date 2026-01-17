/**
 * API Route: Learning Path [id]
 * Get, update, delete specific learning path
 * Plan 8 MVP - Wave 3: Progress Tracking [F-15]
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/learning-path/[id]
 * Get learning path details with all topics
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

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
  } catch (error) {
    logger.error("Failed to fetch learning path", { error });
    return NextResponse.json(
      { error: "Failed to fetch learning path" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/learning-path/[id]
 * Delete a learning path
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

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
  } catch (error) {
    logger.error("Failed to delete learning path", { error });
    return NextResponse.json(
      { error: "Failed to delete learning path" },
      { status: 500 },
    );
  }
}
