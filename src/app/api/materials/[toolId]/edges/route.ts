/**
 * Material Edges API - Knowledge Graph relationships
 * Wave 3: GET, POST, DELETE edges for a material
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { z } from "zod";

const EdgeCreateSchema = z.object({
  toId: z.string().min(1),
  relationType: z.enum([
    "derived_from",
    "related_to",
    "prerequisite",
    "extends",
  ]),
  weight: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/materials/[toolId]/edges
 * Get all edges connected to this material (both from and to)
 */
export const GET = pipe(
  withSentry("/api/materials/[toolId]/edges"),
  withAuth,
)(async (ctx) => {
  const { toolId } = await ctx.params;
  const userId = ctx.userId!;

  // Find material by toolId
  const material = await prisma.material.findUnique({
    where: { toolId },
    select: { id: true, userId: true },
  });

  if (!material || material.userId !== userId) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const edges = await prisma.materialEdge.findMany({
    where: {
      OR: [{ fromId: material.id }, { toId: material.id }],
    },
    include: {
      from: {
        select: { id: true, toolId: true, title: true, toolType: true },
      },
      to: { select: { id: true, toolId: true, title: true, toolType: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ edges });
});

/**
 * POST /api/materials/[toolId]/edges
 * Create a new edge from this material to another
 */
export const POST = pipe(
  withSentry("/api/materials/[toolId]/edges"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { toolId } = await ctx.params;
  const body = await ctx.req.json();
  const userId = ctx.userId!;

  const parsed = EdgeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Find source material
  const fromMaterial = await prisma.material.findUnique({
    where: { toolId },
    select: { id: true, userId: true },
  });

  if (!fromMaterial || fromMaterial.userId !== userId) {
    return NextResponse.json(
      { error: "Source material not found" },
      { status: 404 },
    );
  }

  // Find target material
  const toMaterial = await prisma.material.findUnique({
    where: { toolId: parsed.data.toId },
    select: { id: true, userId: true },
  });

  if (!toMaterial || toMaterial.userId !== userId) {
    return NextResponse.json(
      { error: "Target material not found" },
      { status: 404 },
    );
  }

  // Create edge
  try {
    const edge = await prisma.materialEdge.create({
      data: {
        fromId: fromMaterial.id,
        toId: toMaterial.id,
        relationType: parsed.data.relationType,
        weight: parsed.data.weight ?? 1.0,
        metadata: parsed.data.metadata as object | undefined,
      },
      include: {
        from: {
          select: { id: true, toolId: true, title: true, toolType: true },
        },
        to: { select: { id: true, toolId: true, title: true, toolType: true } },
      },
    });

    return NextResponse.json({ edge }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Edge already exists" },
        { status: 409 },
      );
    }
    throw error;
  }
});

/**
 * DELETE /api/materials/[toolId]/edges
 * Delete an edge (requires toId and relationType in query params)
 */
export const DELETE = pipe(
  withSentry("/api/materials/[toolId]/edges"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const { toolId } = await ctx.params;
  const { searchParams } = new URL(ctx.req.url);
  const toToolId = searchParams.get("toId");
  const relationType = searchParams.get("relationType");
  const userId = ctx.userId!;

  if (!toToolId || !relationType) {
    return NextResponse.json(
      { error: "Missing toId or relationType query params" },
      { status: 400 },
    );
  }

  // Find both materials
  const [fromMaterial, toMaterial] = await Promise.all([
    prisma.material.findUnique({
      where: { toolId },
      select: { id: true, userId: true },
    }),
    prisma.material.findUnique({
      where: { toolId: toToolId },
      select: { id: true, userId: true },
    }),
  ]);

  if (
    !fromMaterial ||
    !toMaterial ||
    fromMaterial.userId !== userId ||
    toMaterial.userId !== userId
  ) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  await prisma.materialEdge.delete({
    where: {
      fromId_toId_relationType: {
        fromId: fromMaterial.id,
        toId: toMaterial.id,
        relationType,
      },
    },
  });

  return NextResponse.json({ success: true });
});
