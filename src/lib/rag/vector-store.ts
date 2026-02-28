/**
 * Vector Store Service for RAG
 * Handles storage and similarity search of embeddings.
 *
 * PostgreSQL Mode: Uses native pgvector with HNSW index for O(log n) queries
 * Fallback: Returns empty results with warning if pgvector unavailable
 *
 * @module rag/vector-store
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkPgvectorStatus, nativeVectorSearch, updateNativeVector } from './pgvector-utils';
import { anonymizeConversationMessage } from '@/lib/privacy';

/** Expected embedding dimensions */
const EXPECTED_DIMENSIONS = 1536;

/**
 * Input for storing an embedding
 */
export interface StoreEmbeddingInput {
  userId: string;
  sourceType: 'material' | 'flashcard' | 'studykit' | 'message' | 'tool' | 'conversation_summary';
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
 * Also updates native vector column when pgvector is available
 * Content is anonymized to ensure COPPA/GDPR compliance
 */
export async function storeEmbedding(input: StoreEmbeddingInput) {
  if (input.vector.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Invalid vector dimensions: expected ${EXPECTED_DIMENSIONS}, got ${input.vector.length}`,
    );
  }

  logger.debug('[VectorStore] Storing embedding', {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    chunkIndex: input.chunkIndex ?? 0,
  });

  // Anonymize content before storing to ensure no PII in vector DB
  const anonymizedContent = anonymizeConversationMessage(input.content);

  const embedding = await prisma.contentEmbedding.create({
    data: {
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      chunkIndex: input.chunkIndex ?? 0,
      content: anonymizedContent,
      vector: JSON.stringify(input.vector),
      model: input.model ?? 'text-embedding-3-small',
      dimensions: input.vector.length,
      tokenCount: Math.ceil(anonymizedContent.length / 4),
      subject: input.subject,
      tags: JSON.stringify(input.tags ?? []),
    },
  });

  // Update native vector for pgvector search (non-blocking)
  updateNativeVector(prisma, embedding.id, input.vector).catch((err) => {
    logger.warn('[VectorStore] Failed to update native vector', {
      error: String(err),
    });
  });

  return embedding;
}

/**
 * Search for similar embeddings
 *
 * PostgreSQL Mode: Uses native pgvector with HNSW index for O(log n) queries
 * Fallback Mode: Fetches all embeddings and computes similarity in JavaScript
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

  // Try native pgvector search first
  const pgStatus = await checkPgvectorStatus(prisma);
  if (pgStatus.available) {
    try {
      const nativeResults = await nativeVectorSearch(prisma, {
        userId,
        vector,
        limit,
        minSimilarity,
        sourceType,
        subject,
      });

      logger.debug('[VectorStore] Native pgvector search used', {
        resultCount: nativeResults.length,
        indexType: pgStatus.indexType,
      });

      return nativeResults.map((r) => ({
        id: r.id,
        sourceType: r.source_type,
        sourceId: r.source_id,
        chunkIndex: r.chunk_index,
        content: r.content,
        similarity: r.similarity,
        subject: r.subject,
        tags: JSON.parse(r.tags) as string[],
      }));
    } catch (err) {
      logger.warn('[VectorStore] Native search failed, falling back to JS', {
        error: String(err),
      });
    }
  }

  // pgvector unavailable — return empty results instead of expensive JS fallback
  logger.warn('[VectorStore] pgvector unavailable, returning empty results', {
    userId,
    sourceType,
    subject,
  });
  return [];
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
