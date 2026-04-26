/**
 * Adaptive Quiz Suggestions
 * Review suggestions and seen concept tracking
 *
 * Plan 9 - Wave 4 [F-18, F-19]
 */

import { logger } from "@/lib/logger";
import { hybridSearch } from "@/lib/rag/server";
import type { Subject } from "@/types";
import { REVIEW_THRESHOLD, type QuizAnalysis } from "./adaptive-quiz-analysis";

/**
 * Review suggestion for low-performing topics
 */
export interface ReviewSuggestion {
  topic: string;
  subject: Subject;
  /** Why this is suggested */
  reason: string;
  /** Related materials to review */
  materials: Array<{
    id: string;
    title: string;
    type: "material" | "flashcard" | "studykit";
    relevance: number;
  }>;
  /** Priority (1 = highest) */
  priority: number;
}

/**
 * Seen concept record
 */
export interface SeenConcept {
  concept: string;
  subject: Subject;
  firstSeenAt: Date;
  lastSeenAt: Date;
  timesReviewed: number;
  masteryLevel: number; // 0-100
}

/**
 * Generate review suggestions for weak topics
 * [F-18]: Quiz < 60% review suggestions
 */
export async function generateReviewSuggestions(
  userId: string,
  analysis: QuizAnalysis,
  subject: Subject,
): Promise<ReviewSuggestion[]> {
  if (!analysis.needsReview || analysis.weakTopics.length === 0) {
    return [];
  }

  const suggestions: ReviewSuggestion[] = [];

  for (const topic of analysis.weakTopics) {
    try {
      // Search for related materials using hybrid retrieval
      const searchResults = await hybridSearch({
        userId,
        query: topic,
        limit: 5,
        sourceType: "material",
        subject: subject.toLowerCase(),
        minScore: 0.4,
      });

      const materials = searchResults.map((r) => ({
        id: r.sourceId,
        title:
          r.content.substring(0, 50) + (r.content.length > 50 ? "..." : ""),
        type: r.sourceType as "material" | "flashcard" | "studykit",
        relevance: r.combinedScore,
      }));

      suggestions.push({
        topic,
        subject,
        reason: `Hai risposto correttamente a meno del ${REVIEW_THRESHOLD}% delle domande su questo argomento`,
        materials,
        priority: materials.length > 0 ? 1 : 2,
      });
    } catch (error) {
      logger.error("[AdaptiveQuiz] Error generating review suggestion", {
        topic,
        error: String(error),
      });

      // Add suggestion without materials
      suggestions.push({
        topic,
        subject,
        reason: `Hai bisogno di ripasso su questo argomento`,
        materials: [],
        priority: 3,
      });
    }
  }

  // Sort by priority
  suggestions.sort((a, b) => a.priority - b.priority);

  logger.info("[AdaptiveQuiz] Generated review suggestions", {
    userId,
    count: suggestions.length,
    topics: suggestions.map((s) => s.topic),
  });

  return suggestions;
}

/**
 * Check if concepts have been seen before
 * [F-19]: Flag already-seen concepts
 */
export async function checkSeenConcepts(
  userId: string,
  concepts: string[],
  subject: Subject,
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
      logger.error("[AdaptiveQuiz] Error checking seen concept", {
        concept,
        error: String(error),
      });
      results.set(concept, null);
    }
  }

  logger.debug("[AdaptiveQuiz] Checked seen concepts", {
    total: concepts.length,
    seen: [...results.values()].filter((v) => v !== null).length,
  });

  return results;
}
