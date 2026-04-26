/**
 * Maestro Knowledge Retriever
 *
 * Retrieves maestro-specific didactic knowledge from pgvector.
 * Provides graceful degradation when pgvector is not available (ADR 0033).
 *
 * @module rag/maestro-knowledge-retriever
 */

import { logger } from '@/lib/logger';
import { isEmbeddingConfigured } from './embedding-service';
import { generatePrivacyAwareEmbedding } from './privacy-aware-embedding';
import { searchSimilar } from './vector-store';

const SYSTEM_USER_ID = 'SYSTEM_MAESTRO_KB';
const DEFAULT_LIMIT = 3;
const MIN_SIMILARITY = 0.5;

export interface MaestroKnowledgeResult {
  content: string;
  similarity: number;
  chunkIndex: number;
}

/**
 * Retrieve relevant didactic knowledge for a maestro based on the user's query.
 * Falls back to empty string if pgvector is unavailable (graceful degradation).
 */
export async function retrieveMaestroKnowledge(
  maestroId: string,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<string> {
  if (!isEmbeddingConfigured()) {
    logger.debug('[MaestroKB] Embedding not configured, graceful fallback');
    return '';
  }

  if (!query || !maestroId) {
    return '';
  }

  try {
    const embeddingResult = await generatePrivacyAwareEmbedding(query);

    const results = await searchSimilar({
      userId: SYSTEM_USER_ID,
      vector: embeddingResult.vector,
      limit,
      minSimilarity: MIN_SIMILARITY,
      sourceType: 'maestro_knowledge',
      subject: undefined,
    });

    const filtered = results.filter((r) => r.sourceId === maestroId);

    if (filtered.length === 0) {
      logger.debug('[MaestroKB] No relevant knowledge found', { maestroId });
      return '';
    }

    const formatted = filtered.map((r) => r.content).join('\n\n');

    logger.debug('[MaestroKB] Knowledge retrieved', {
      maestroId,
      resultCount: filtered.length,
      topSimilarity: filtered[0]?.similarity,
    });

    return `## Conoscenze Didattiche Rilevanti\n${formatted}`;
  } catch (error) {
    logger.warn('[MaestroKB] Retrieval failed, graceful fallback', {
      maestroId,
      error: error instanceof Error ? error.message : String(error),
    });
    return '';
  }
}

/**
 * Retrieve raw results for testing/inspection.
 */
export async function retrieveMaestroKnowledgeRaw(
  maestroId: string,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<MaestroKnowledgeResult[]> {
  if (!isEmbeddingConfigured()) {
    return [];
  }

  try {
    const embeddingResult = await generatePrivacyAwareEmbedding(query);

    const results = await searchSimilar({
      userId: SYSTEM_USER_ID,
      vector: embeddingResult.vector,
      limit,
      minSimilarity: MIN_SIMILARITY,
      sourceType: 'maestro_knowledge',
    });

    return results
      .filter((r) => r.sourceId === maestroId)
      .map((r) => ({
        content: r.content,
        similarity: r.similarity,
        chunkIndex: r.chunkIndex,
      }));
  } catch {
    return [];
  }
}
