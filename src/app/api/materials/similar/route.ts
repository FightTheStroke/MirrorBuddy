/**
 * Similarity Search API - Wave 4
 * Find materials similar to a given material using vector similarity
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { cosineSimilarity } from '@/lib/rag/embedding-service';
import { logger } from '@/lib/logger';

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('mirrorbuddy-user-id')?.value || null;
}

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
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('toolId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '5'), 20);

    if (!toolId) {
      return NextResponse.json(
        { error: 'Missing toolId query param' },
        { status: 400 }
      );
    }

    // Find source material
    const sourceMaterial = await prisma.material.findUnique({
      where: { toolId },
      select: { id: true },
    });

    if (!sourceMaterial) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }

    // Get source embedding
    const sourceEmbedding = await prisma.contentEmbedding.findFirst({
      where: {
        sourceType: 'material',
        sourceId: sourceMaterial.id,
      },
      select: { vector: true },
    });

    if (!sourceEmbedding?.vector) {
      return NextResponse.json({ similar: [] });
    }

    // Parse source vector
    let sourceVector: number[];
    try {
      sourceVector = JSON.parse(sourceEmbedding.vector);
    } catch {
      return NextResponse.json({ similar: [] });
    }

    // Get all material embeddings for this user (excluding source)
    const embeddings = await prisma.contentEmbedding.findMany({
      where: {
        userId,
        sourceType: 'material',
        NOT: { sourceId: sourceMaterial.id },
      },
      select: {
        sourceId: true,
        vector: true,
      },
    });

    // Calculate similarities
    const similarities: Array<{ sourceId: string; similarity: number }> = [];

    for (const emb of embeddings) {
      if (!emb.vector) continue;
      try {
        const vector = JSON.parse(emb.vector);
        const similarity = cosineSimilarity(sourceVector, vector);
        similarities.push({ sourceId: emb.sourceId, similarity });
      } catch {
        continue;
      }
    }

    // Sort by similarity and take top N
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topMatches = similarities.slice(0, limit);

    if (topMatches.length === 0) {
      return NextResponse.json({ similar: [] });
    }

    // Fetch material details
    const materials = await prisma.material.findMany({
      where: {
        id: { in: topMatches.map((m) => m.sourceId) },
        status: 'active',
      },
      select: {
        id: true,
        toolId: true,
        title: true,
        toolType: true,
      },
    });

    // Build result with similarity scores
    const similar: SimilarMaterial[] = topMatches
      .map((match) => {
        const mat = materials.find((m) => m.id === match.sourceId);
        if (!mat) return null;
        return {
          id: mat.id,
          toolId: mat.toolId,
          title: mat.title,
          toolType: mat.toolType,
          similarity: Math.round(match.similarity * 100) / 100,
        };
      })
      .filter((m): m is SimilarMaterial => m !== null);

    return NextResponse.json({ similar });
  } catch (error) {
    logger.error('Failed to find similar materials', { error });
    return NextResponse.json(
      { error: 'Failed to find similar materials' },
      { status: 500 }
    );
  }
}
