/**
 * RAG context for the streaming chat route
 *
 * Kept separate from helpers.ts so the retrieval work can be started alongside
 * the memory load instead of after it, and so helpers.ts stays readable.
 */

import { findSimilarMaterials, findRelatedConcepts } from '@/lib/rag/server';
import { logger } from '@/lib/logger';
import { resolveQueryEmbedding } from '../query-embedding';

/**
 * Retrieve the student's relevant materials and study kits for a question.
 *
 * The two searches are independent and run together: one waits on the other for
 * no reason, and both sit in front of the student's first token.
 *
 * @param userId - Owner of the materials being searched
 * @param query - The student's last message
 * @returns A prompt fragment, or an empty string when nothing relevant is found
 */
export async function buildRAGFragment(userId: string, query: string): Promise<string> {
  try {
    const embedding = await resolveQueryEmbedding(query);

    const [relevantMaterials, relatedStudyKits] = await Promise.all([
      findSimilarMaterials({
        userId,
        query,
        embedding,
        limit: 3,
        minSimilarity: 0.6,
      }),
      findRelatedConcepts({
        userId,
        query,
        embedding,
        limit: 3,
        minSimilarity: 0.5,
        includeFlashcards: false,
        includeStudykits: true,
      }),
    ]);

    const allResults = [...relevantMaterials, ...relatedStudyKits];
    if (allResults.length === 0) {
      return '';
    }

    const ragContext = allResults.map((m) => `- ${m.content}`).join('\n');
    return `\n\n[Materiali rilevanti]\n${ragContext}`;
  } catch (ragError) {
    logger.warn('Failed to load RAG context', { error: String(ragError) });
    return '';
  }
}
