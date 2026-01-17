/**
 * Seen Concepts Tracking
 * Track and check if concepts have been seen before
 */

import { logger } from '@/lib/logger';
import { hybridSearch } from '@/lib/rag';
import type { Subject } from '@/types';
import type { SeenConcept } from './types';

/**
 * Check if concepts have been seen before
 * [F-19]: Flag already-seen concepts
 */
export async function checkSeenConcepts(
  userId: string,
  concepts: string[],
  subject: Subject
): Promise<Map<string, SeenConcept | null>> {
  const results = new Map<string, SeenConcept | null>();

  for (const concept of concepts) {
    try {
      // Search for this concept in user's history
      const searchResults = await hybridSearch({
        userId,
        query: concept,
        limit: 1,
        subject: subject.toLowerCase(),
        minScore: 0.7, // High threshold for "same" concept
      });

      if (searchResults.length > 0 && searchResults[0].combinedScore > 0.8) {
        // Concept was seen before (would need to be enhanced with actual tracking)
        results.set(concept, {
          concept,
          subject,
          firstSeenAt: new Date(), // Would come from actual tracking
          lastSeenAt: new Date(),
          timesReviewed: 1,
          masteryLevel: Math.round(searchResults[0].combinedScore * 100),
        });
      } else {
        results.set(concept, null);
      }
    } catch (error) {
      logger.error('[AdaptiveQuiz] Error checking seen concept', {
        concept,
        error: String(error),
      });
      results.set(concept, null);
    }
  }

  logger.debug('[AdaptiveQuiz] Checked seen concepts', {
    total: concepts.length,
    seen: [...results.values()].filter((v) => v !== null).length,
  });

  return results;
}
