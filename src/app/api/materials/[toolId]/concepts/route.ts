/**
 * Material Concepts API - Knowledge Graph concept links
 * Wave 3: GET, POST, DELETE concept links for a material
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ConceptLinkSchema = z.object({
  conceptId: z.string().min(1),
  relevance: z.number().min(0).max(1).optional().default(1.0),
});

/**
 * GET /api/materials/[toolId]/concepts
 * Get all concepts linked to this material
 */
export const GET = pipe(
  withSentry("/api/materials/[toolId]/concepts"),
  withAuth,
)(async (ctx) => {
  const { toolId } = await ctx.params;
  const userId = ctx.userId!;

  const material = await prisma.material.findUnique({
    where: { toolId },
    select: { id: true, userId: true },
  });

  if (!material || material.userId !== userId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const concepts = await prisma.materialConcept.findMany({
    where: { materialId: material.id },
    include: {
      concept: {
        select: {
          id: true,
          name: true,
          description: true,
          subject: true,
        },
      },
    },
    orderBy: { relevance: "desc" },
  });

  return NextResponse.json({
    concepts: concepts.map((mc) => ({
      ...mc.concept,
      relevance: mc.relevance,
    })),
  });
});

/**
 * POST /api/materials/[toolId]/concepts
 * Link a concept to this material
 */
export const POST = pipe(
  withSentry("/api/materials/[toolId]/concepts"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { toolId } = await ctx.params;
  const body = await ctx.req.json();
  const userId = ctx.userId!;

  const parsed = ConceptLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const material = await prisma.material.findUnique({
    where: { toolId },
    select: { id: true, userId: true },
  });

  if (!material || material.userId !== userId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  // Verify concept exists
  const concept = await prisma.concept.findUnique({
    where: { id: parsed.data.conceptId, userId },
  });

  if (!concept) {
    return NextResponse.json({ error: "Concept not found" }, { status: 404 });
  }

  // Create or update link
  const link = await prisma.materialConcept.upsert({
    where: {
      materialId_conceptId: {
        materialId: material.id,
        conceptId: parsed.data.conceptId,
      },
    },
    create: {
      materialId: material.id,
      conceptId: parsed.data.conceptId,
      relevance: parsed.data.relevance,
    },
    update: {
      relevance: parsed.data.relevance,
    },
    include: {
      concept: {
        select: { id: true, name: true, description: true, subject: true },
      },
    },
  });

  return NextResponse.json(
    {
      concept: {
        ...link.concept,
        relevance: link.relevance,
      },
    },
    { status: 201 },
  );
});

/**
 * DELETE /api/materials/[toolId]/concepts
 * Unlink a concept from this material (conceptId in query params)
 */
export const DELETE = pipe(
  withSentry("/api/materials/[toolId]/concepts"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { toolId } = await ctx.params;
  const { searchParams } = new URL(ctx.req.url);
  const conceptId = searchParams.get("conceptId");
  const userId = ctx.userId!;

  if (!conceptId) {
    return NextResponse.json(
      { error: "Missing conceptId query param" },
      { status: 400 },
    );
  }

  const material = await prisma.material.findUnique({
    where: { toolId },
    select: { id: true, userId: true },
  });

  if (!material || material.userId !== userId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const concept = await prisma.concept.findUnique({
    where: { id: conceptId, userId },
    select: { id: true },
  });

  if (!concept) {
    return NextResponse.json({ error: "Concept not found" }, { status: 404 });
  }

  await prisma.materialConcept.delete({
    where: {
      materialId_conceptId: {
        materialId: material.id,
        conceptId: concept.id,
      },
    },
  });

  return NextResponse.json({ success: true });
});
