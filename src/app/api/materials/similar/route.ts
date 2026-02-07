/**
 * Similarity Search API - Wave 4
 * Find materials similar to a given material using vector similarity
 * Uses pgvector O(log n) HNSW index when available (T4-05 optimization)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { searchSimilar } from "@/lib/rag";

interface SimilarMaterial {
  id: string;
  toolId: string;
  title: string;
  toolType: string;
  similarity: number;
}

/**
 * GET /api/materials/similar?toolId=xxx&limit=5
 * Find materials similar to the given toolId
 */
export const GET = pipe(
  withSentry("/api/materials/similar"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const toolId = searchParams.get("toolId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "5"), 20);

  if (!toolId) {
    return NextResponse.json(
      { error: "Missing toolId query param" },
      { status: 400 },
    );
  }

  // Find source material with its embedding
  const sourceMaterial = await prisma.material.findUnique({
    where: { toolId },
    select: { id: true },
  });

  if (!sourceMaterial) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  // Get source embedding vector
  const sourceEmbedding = await prisma.contentEmbedding.findFirst({
    where: {
      sourceType: "material",
      sourceId: sourceMaterial.id,
    },
    select: { vector: true },
  });

  if (!sourceEmbedding?.vector) {
    return NextResponse.json({ similar: [] });
  }

  let sourceVector: number[];
  try {
    sourceVector = JSON.parse(sourceEmbedding.vector);
  } catch {
    return NextResponse.json({ similar: [] });
  }

  // Use optimized searchSimilar (pgvector when available)
  const searchResults = await searchSimilar({
    userId,
    vector: sourceVector,
    limit: limit + 1,
    minSimilarity: 0.3,
    sourceType: "material",
  });

  // Filter out the source material itself
  const filtered = searchResults
    .filter((r) => r.sourceId !== sourceMaterial.id)
    .slice(0, limit);

  if (filtered.length === 0) {
    return NextResponse.json({ similar: [] });
  }

  // Fetch material details in single query
  const materials = await prisma.material.findMany({
    where: {
      id: { in: filtered.map((r) => r.sourceId) },
      status: "active",
    },
    select: {
      id: true,
      toolId: true,
      title: true,
      toolType: true,
    },
  });

  // Build result with similarity scores (preserve order)
  const similar: SimilarMaterial[] = filtered
    .map((result) => {
      const mat = materials.find((m) => m.id === result.sourceId);
      if (!mat) return null;
      return {
        id: mat.id,
        toolId: mat.toolId,
        title: mat.title,
        toolType: mat.toolType,
        similarity: Math.round(result.similarity * 100) / 100,
      };
    })
    .filter((m): m is SimilarMaterial => m !== null);

  return NextResponse.json({ similar });
});
