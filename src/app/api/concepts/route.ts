/**
 * Concepts API - Knowledge Graph abstract concepts
 * Wave 3: GET all, POST new concept
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";

const ConceptCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  subject: z.string().max(50).optional(),
});

/**
 * GET /api/concepts
 * Get all concepts for the current user with pagination
 */
export const GET = pipe(
  withSentry("/api/concepts"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
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
});

/**
 * POST /api/concepts
 * Create a new concept
 */
export const POST = pipe(
  withSentry("/api/concepts"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const body = await ctx.req.json();
  const parsed = ConceptCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
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
    throw error;
  }
});
