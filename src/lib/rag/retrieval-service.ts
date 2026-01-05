/**
 * RAG Retrieval Service
 * Provides semantic search for finding similar materials and related concepts.
 *
 * @module rag/retrieval-service
 */

import { logger } from '@/lib/logger';
import { generateEmbedding } from './embedding-service';
import { searchSimilar, storeEmbedding, type VectorSearchResult } from './vector-store';
import { chunkText } from './semantic-chunker';

/**
 * Result from retrieval operations
 */
export interface RetrievalResult {
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
 * Options for finding similar materials
 */
export interface FindSimilarOptions {
  userId: string;
  query?: string;
  embedding?: number[];
  limit?: number;
  minSimilarity?: number;
  subject?: string;
  excludeSourceIds?: string[];
}

/**
 * Options for finding related concepts
 */
export interface FindRelatedOptions {
  userId: string;
  query?: string;
  embedding?: number[];
  limit?: number;
  minSimilarity?: number;
  subject?: string;
  includeFlashcards?: boolean;
  includeStudykits?: boolean;
  excludeSourceIds?: string[];
}

/**
 * Input for indexing material
 */
export interface IndexMaterialInput {
  userId: string;
  sourceType: 'material' | 'flashcard' | 'studykit' | 'message';
  sourceId: string;
  content: string;
  subject?: string;
  tags?: string[];
}

/**
 * Result from indexing operation
 */
export interface IndexResult {
  chunksIndexed: number;
  totalTokens: number;
  embeddingIds: string[];
}

/**
 * Find materials similar to a query or embedding
 * Searches only 'material' type embeddings
 */
export async function findSimilarMaterials(
  options: FindSimilarOptions
): Promise<RetrievalResult[]> {
  const {
    userId,
    query,
    embedding,
    limit = 10,
    minSimilarity = 0.5,
    subject,
    excludeSourceIds = [],
  } = options;

  if (!query && !embedding) {
    throw new Error('Either query or embedding must be provided');
  }

  logger.debug('[Retrieval] Finding similar materials', {
    userId,
    hasQuery: !!query,
    hasEmbedding: !!embedding,
    limit,
    subject,
    excludeCount: excludeSourceIds.length,
  });

  // Get or generate embedding
  let searchVector: number[];
  if (embedding) {
    searchVector = embedding;
  } else {
    const result = await generateEmbedding(query!);
    searchVector = result.vector;
  }

  // Search for similar materials
  const results = await searchSimilar({
    userId,
    vector: searchVector,
    limit: limit + excludeSourceIds.length, // Fetch extra to account for exclusions
    minSimilarity,
    sourceType: 'material',
    subject,
  });

  // Filter excluded source IDs and limit
  const filtered = results
    .filter((r) => !excludeSourceIds.includes(r.sourceId))
    .slice(0, limit);

  return filtered.map(mapToRetrievalResult);
}

/**
 * Find related concepts from flashcards and studykits
 * Useful for suggesting review of previously studied concepts
 */
export async function findRelatedConcepts(
  options: FindRelatedOptions
): Promise<RetrievalResult[]> {
  const {
    userId,
    query,
    embedding,
    limit = 10,
    minSimilarity = 0.5,
    subject,
    includeFlashcards = true,
    includeStudykits = true,
    excludeSourceIds = [],
  } = options;

  if (!query && !embedding) {
    throw new Error('Either query or embedding must be provided');
  }

  logger.debug('[Retrieval] Finding related concepts', {
    userId,
    hasQuery: !!query,
    includeFlashcards,
    includeStudykits,
    excludeCount: excludeSourceIds.length,
  });

  // Get or generate embedding
  let searchVector: number[];
  if (embedding) {
    searchVector = embedding;
  } else {
    const result = await generateEmbedding(query!);
    searchVector = result.vector;
  }

  // Collect results from multiple source types
  const allResults: VectorSearchResult[] = [];

  if (includeFlashcards) {
    const flashcardResults = await searchSimilar({
      userId,
      vector: searchVector,
      limit,
      minSimilarity,
      sourceType: 'flashcard',
      subject,
    });
    allResults.push(...flashcardResults);
  }

  if (includeStudykits) {
    const studykitResults = await searchSimilar({
      userId,
      vector: searchVector,
      limit,
      minSimilarity,
      sourceType: 'studykit',
      subject,
    });
    allResults.push(...studykitResults);
  }

  // Filter excluded source IDs
  const filtered = allResults.filter((r) => !excludeSourceIds.includes(r.sourceId));

  // Sort by similarity and limit
  filtered.sort((a, b) => b.similarity - a.similarity);
  const limited = filtered.slice(0, limit);

  return limited.map(mapToRetrievalResult);
}

/**
 * Index material content for later retrieval
 * Chunks content and stores embeddings
 */
export async function indexMaterial(input: IndexMaterialInput): Promise<IndexResult> {
  const { userId, sourceType, sourceId, content, subject, tags } = input;

  logger.debug('[Retrieval] Indexing material', {
    userId,
    sourceType,
    sourceId,
    contentLength: content.length,
    subject,
  });

  // Handle empty content
  if (!content || content.trim().length === 0) {
    return {
      chunksIndexed: 0,
      totalTokens: 0,
      embeddingIds: [],
    };
  }

  // Chunk the content
  const chunks = chunkText(content, {
    maxChunkSize: 500,
    overlap: 50,
  });

  const embeddingIds: string[] = [];
  let totalTokens = 0;

  // Generate and store embeddings for each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const embeddingResult = await generateEmbedding(chunk.content);
      totalTokens += embeddingResult.usage.tokens;

      const stored = await storeEmbedding({
        userId,
        sourceType,
        sourceId,
        chunkIndex: i,
        content: chunk.content,
        vector: embeddingResult.vector,
        model: embeddingResult.model,
        subject,
        tags,
      });

      embeddingIds.push(stored.id);
    } catch (error) {
      logger.error('[Retrieval] Failed to index chunk', {
        sourceId,
        chunkIndex: i,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue with other chunks
    }
  }

  logger.info('[Retrieval] Material indexed', {
    sourceId,
    chunksIndexed: embeddingIds.length,
    totalTokens,
  });

  return {
    chunksIndexed: embeddingIds.length,
    totalTokens,
    embeddingIds,
  };
}

/**
 * Map VectorSearchResult to RetrievalResult
 */
function mapToRetrievalResult(result: VectorSearchResult): RetrievalResult {
  return {
    id: result.id,
    sourceType: result.sourceType,
    sourceId: result.sourceId,
    chunkIndex: result.chunkIndex,
    content: result.content,
    similarity: result.similarity,
    subject: result.subject,
    tags: result.tags,
  };
}
