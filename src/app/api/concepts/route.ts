/**
 * Concepts API - Knowledge Graph abstract concepts
 * Wave 3: GET all, POST new concept
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { validateAuth } from "@/lib/auth/session-auth";

async function getUserId(): Promise<string | null> {
  const auth = await validateAuth();
  return auth.authenticated && auth.userId ? auth.userId : null;
}

const ConceptCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subject: z.string().max(50).optional(),
});

/**
 * GET /api/concepts
 * Get all concepts for the current user with pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");

    // Pagination parameters (defaults: page 1, limit 50, max 200)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10)),
    );
    const skip = (page - 1) * limit;

    const whereClause = {
      userId,
      ...(subject ? { subject } : {}),
    };

    // Get total count and paginated results in parallel
    const [total, concepts] = await Promise.all([
      prisma.concept.count({ where: whereClause }),
      prisma.concept.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { materials: true },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      concepts: concepts.map((c: (typeof concepts)[number]) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        subject: c.subject,
        materialCount: c._count.materials,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch concepts", undefined, error);
    return NextResponse.json(
      { error: "Failed to fetch concepts" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/concepts
 * Create a new concept
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ConceptCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const concept = await prisma.concept.create({
      data: {
        userId,
        name: parsed.data.name,
        description: parsed.data.description,
        subject: parsed.data.subject,
      },
    });

    return NextResponse.json({ concept }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Concept with this name already exists" },
        { status: 409 },
      );
    }

    logger.error("Failed to create concept", undefined, error);
    return NextResponse.json(
      { error: "Failed to create concept" },
      { status: 500 },
    );
  }
}
