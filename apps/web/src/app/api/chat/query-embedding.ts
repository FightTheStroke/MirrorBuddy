/**
 * Shared per-request query embedding
 *
 * A single chat request asks several retrievers about the same student question:
 * the maestro knowledge base, the student's own materials, and their study kits.
 * Each retriever used to embed that question itself, so one message paid for the
 * same Azure embedding call three times - hundreds of milliseconds of pure delay
 * before the first word of the answer appears.
 *
 * Computing the vector once here and handing it to every retriever removes that
 * duplication without changing what any retriever returns.
 */

import { isEmbeddingConfigured, generatePrivacyAwareEmbedding } from '@/lib/rag/server';
import { logger } from '@/lib/logger';

/**
 * Compute the query vector once for the whole request.
 *
 * Never throws: retrieval is an enhancement, not a requirement, and a failure
 * here must leave the student with an answer rather than an error. On failure
 * the retrievers fall back to generating their own embedding as before.
 *
 * @param query - The student's last message
 * @returns The query vector, or undefined when it cannot be computed
 */
export async function resolveQueryEmbedding(query: string): Promise<number[] | undefined> {
  if (!query || !isEmbeddingConfigured()) {
    return undefined;
  }

  try {
    const result = await generatePrivacyAwareEmbedding(query);
    return result.vector;
  } catch (error) {
    logger.warn('Query embedding failed, retrievers will fall back', {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
