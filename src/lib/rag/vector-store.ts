/**
 * Vector Store Service for RAG
 * Handles storage and similarity search of embeddings.
 *
 * SQLite Mode: Uses JSON string for vectors, JavaScript cosine similarity
 * PostgreSQL Mode: Use raw SQL with pgvector for better performance
 *
 * @module rag/vector-store
 */

import { prisma } from '@/lib/db';
import { cosineSimilarity } from './embedding-service';
import { logger } from '@/lib/logger';

/** Expected embedding dimensions */
const EXPECTED_DIMENSIONS = 1536;

/**
 * Input for storing an embedding
 */
export interface StoreEmbeddingInput {
  userId: string;
  sourceType: 'material' | 'flashcard' | 'studykit' | 'message';
  sourceId: string;
  chunkIndex?: number;
  content: string;
  vector: number[];
  model?: string;
  subject?: string;
  tags?: string[];
}

/**
 * Search result with similarity score
 */
export interface VectorSearchResult {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  subject: string | null;
  tags: string[];
}

/**
 * Search options
 */
export interface SearchOptions {
  userId: string;
  vector: number[];
  limit?: number;
  minSimilarity?: number;
  sourceType?: string;
  subject?: string;
}

/**
 * Delete options
 */
export interface DeleteOptions {
  userId: string;
  sourceType?: string;
  sourceId?: string;
}

/**
 * Store an embedding in the database
 */
export async function storeEmbedding(input: StoreEmbeddingInput) {
  if (input.vector.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Invalid vector dimensions: expected ${EXPECTED_DIMENSIONS}, got ${input.vector.length}`
    );
  }

  logger.debug('[VectorStore] Storing embedding', {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    chunkIndex: input.chunkIndex ?? 0,
  });

  return prisma.contentEmbedding.create({
    data: {
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      chunkIndex: input.chunkIndex ?? 0,
      content: input.content,
      vector: JSON.stringify(input.vector),
      model: input.model ?? 'text-embedding-3-small',
      dimensions: input.vector.length,
      tokenCount: Math.ceil(input.content.length / 4),
      subject: input.subject,
      tags: JSON.stringify(input.tags ?? []),
    },
  });
}

/**
 * Search for similar embeddings
 *
 * SQLite Mode: Fetches all embeddings and computes similarity in JavaScript
 * For production with large datasets, migrate to PostgreSQL with pgvector
 */
export async function searchSimilar(options: SearchOptions): Promise<VectorSearchResult[]> {
  const { userId, vector, limit = 10, minSimilarity = 0.5, sourceType, subject } = options;

  logger.debug('[VectorStore] Searching similar', {
    userId,
    limit,
    minSimilarity,
    sourceType,
    subject,
  });

  // Build where clause - filter out null vectors at database level for performance
  const where: Record<string, unknown> = { userId, vector: { not: null } };
  if (sourceType) where.sourceType = sourceType;
  if (subject) where.subject = subject;

  // Fetch candidate embeddings
  // Note: For large datasets, consider pagination or PostgreSQL pgvector with vectorNative column for native vector operations
  const embeddings = await prisma.contentEmbedding.findMany({
    where,
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      chunkIndex: true,
      content: true,
      vector: true,
      subject: true,
      tags: true,
    },
  });

  // Compute similarity scores
  const results: VectorSearchResult[] = [];

  for (const emb of embeddings) {
    // Skip embeddings with null vectors
    if (!emb.vector) {
      logger.warn('[VectorStore] Skipping embedding with null vector', {
        id: emb.id,
        sourceType: emb.sourceType,
        sourceId: emb.sourceId,
      });
      continue;
    }

    const storedVector = JSON.parse(emb.vector) as number[];
    const similarity = cosineSimilarity(vector, storedVector);

    if (similarity >= minSimilarity) {
      results.push({
        id: emb.id,
        sourceType: emb.sourceType,
        sourceId: emb.sourceId,
        chunkIndex: emb.chunkIndex,
        content: emb.content,
        similarity,
        subject: emb.subject,
        tags: JSON.parse(emb.tags) as string[],
      });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  // Return top results
  return results.slice(0, limit);
}

/**
 * Delete embeddings by source
 */
export async function deleteEmbeddings(options: DeleteOptions): Promise<number> {
  const { userId, sourceType, sourceId } = options;

  const where: Record<string, unknown> = { userId };
  if (sourceType) where.sourceType = sourceType;
  if (sourceId) where.sourceId = sourceId;

  logger.debug('[VectorStore] Deleting embeddings', where);

  const result = await prisma.contentEmbedding.deleteMany({ where });
  return result.count;
}

/**
 * Get embedding count for user
 */
export async function getEmbeddingCount(userId: string): Promise<number> {
  return prisma.contentEmbedding.count({ where: { userId } });
}
