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

/**
 * Cosine-similarity floor for accepting a chunk.
 *
 * Measured 2026-08-18 against the full seeded corpus (241 chunks, 30 maestri,
 * text-embedding-3-small) with 8 on-topic Italian questions and an off-topic
 * control ("ricetta della carbonara"):
 *
 *   threshold  on-topic retrieved  off-topic leaked
 *   0.50       1/8                 0/8
 *   0.40       6/8                 0/8
 *   0.30       8/8                 0/8
 *   0.25       8/8                 1/8
 *
 * The previous value of 0.50 admitted almost nothing: on-topic top scores ran
 * 0.30-0.63 (median 0.44), so the retriever returned '' even against a fully
 * populated index. 0.30 is the lowest floor that still leaked no off-topic
 * chunk. Caveat: 8 queries in one language is a smoke measurement, not a
 * benchmark; revisit if the embedding model changes.
 */
const MIN_SIMILARITY = 0.3;

export interface MaestroKnowledgeResult {
  content: string;
  similarity: number;
  chunkIndex: number;
}

/**
 * Retrieve relevant didactic knowledge for a maestro based on the user's query.
 * Falls back to empty string if pgvector is unavailable (graceful degradation).
 *
 * @param embedding - Optional pre-computed query vector. A single chat request
 *   asks several retrievers about the same question; passing the vector in avoids
 *   paying for the identical embedding call more than once, which is pure latency
 *   in front of the student's first token.
 */
export async function retrieveMaestroKnowledge(
  maestroId: string,
  query: string,
  limit = DEFAULT_LIMIT,
  embedding?: number[],
): Promise<string> {
  if (!embedding && !isEmbeddingConfigured()) {
    logger.debug('[MaestroKB] Embedding not configured, graceful fallback');
    return '';
  }

  if (!query || !maestroId) {
    return '';
  }

  try {
    const vector = embedding ?? (await generatePrivacyAwareEmbedding(query)).vector;

    const results = await searchSimilar({
      userId: SYSTEM_USER_ID,
      vector,
      limit,
      minSimilarity: MIN_SIMILARITY,
      sourceType: 'maestro_knowledge',
      sourceId: maestroId,
      subject: undefined,
    });

    // The store filters by maestro now, so nothing foreign should arrive here.
    // Kept as a belt: a database still on the six-argument search function
    // falls back to the JS path, and this guarantees the persona boundary holds
    // whichever path served the query.
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
      sourceId: maestroId,
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
