// ============================================================================
// API ROUTE: Tags
// GET: List user's tags
// POST: Create new tag
// ADR: 0022-knowledge-hub-material-organization.md
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseNotInitialized } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";
import { CreateTagSchema } from "@/lib/validation/schemas/organization";
import { requireCSRF } from "@/lib/security/csrf";
import * as Sentry from "@sentry/nextjs";

/**
 * GET /api/tags
 *
 * Returns all tags for the current user with material counts.
 * Supports pagination via ?page=1&limit=100 (max 500)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const auth = await validateAuth();
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;

    // 2. Pagination params (defaults: page=1, limit=100, max=500)
    const { searchParams } = new URL(request.url);
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
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/tags" },
    });

    logger.error("Tags GET error", { error: String(error) });

    if (isDatabaseNotInitialized(error)) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tags
 *
 * Create a new tag for the current user.
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
  } catch (error) {
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(error, {
      tags: { api: "/api/tags" },
    });

    logger.error("Tags POST error", { error: String(error) });

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 },
    );
  }
}
