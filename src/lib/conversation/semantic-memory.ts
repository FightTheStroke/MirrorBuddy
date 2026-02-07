/**
 * Semantic Memory Service
 *
 * Enables searching conversation summaries using RAG (vector similarity search).
 * Uses pgvector similarity search on ContentEmbedding table.
 *
 * Only available for Pro tier users (semantic search feature).
 *
 * @module conversation/semantic-memory
 */

import { logger } from "@/lib/logger";
import { generatePrivacyAwareEmbedding, searchSimilar } from "@/lib/rag";
import { getTierMemoryLimits } from "./tier-memory-config";
import type { TierName } from "@/types/tier-types";

/**
 * A relevant conversation summary with metadata
 */
export interface RelevantSummary {
  /** ID of the conversation this summary belongs to */
  conversationId: string;

  /** The summary content text */
  content: string;

  /** Relevance score from vector similarity (0-1, higher is more relevant) */
  relevanceScore: number;

  /** When this conversation occurred */
  date: Date;

  /** Subject/topic of the conversation */
  subject: string | null;

  /** Tags associated with this conversation */
  tags: string[];
}

/**
 * Search for relevant conversation summaries using semantic search.
 *
 * Uses pgvector similarity search to find conversation summaries
 * that are semantically similar to the query.
 *
 * **Tier Requirements**:
 * - Pro tier: Semantic search enabled
 * - Base/Trial tier: Returns empty array (feature not available)
 *
 * @param userId User identifier
 * @param query Search query (natural language)
 * @param tierName User's subscription tier (defaults to 'base')
 * @param limit Maximum number of results to return (default: 10)
 * @returns Array of relevant summaries sorted by relevance score (highest first)
 *
 * @example
 * ```typescript
 * const summaries = await searchRelevantSummaries(
 *   'user-123',
 *   'What did we discuss about mathematics?',
 *   'pro',
 *   5
 * );
 *
 * for (const summary of summaries) {
 *   console.log(`Score: ${summary.relevanceScore}`);
 *   console.log(`Content: ${summary.content}`);
 * }
 * ```
 */
export async function searchRelevantSummaries(
  userId: string,
  query: string,
  tierName: TierName = "base",
  limit: number = 10,
): Promise<RelevantSummary[]> {
  try {
    // Check if semantic search is enabled for this tier
    const limits = getTierMemoryLimits(tierName);
    if (!limits.semanticEnabled) {
      logger.debug("Semantic search not enabled for tier", {
        userId,
        tierName,
      });
      return [];
    }

    // Validate inputs
    if (!query || query.trim().length === 0) {
      logger.warn("Empty query provided for semantic search", { userId });
      return [];
    }

    logger.debug("Searching relevant summaries", {
      userId,
      queryLength: query.length,
      tierName,
      limit,
    });

    // Generate embedding for the query
    const embeddingResult = await generatePrivacyAwareEmbedding(query);

    // Search for similar conversation summaries
    const results = await searchSimilar({
      userId,
      vector: embeddingResult.vector,
      limit,
      minSimilarity: 0.6, // Only return reasonably relevant results
      sourceType: "conversation_summary",
    });

    // Map results to RelevantSummary format
    const summaries: RelevantSummary[] = results.map((result) => ({
      conversationId: result.sourceId,
      content: result.content,
      relevanceScore: result.similarity,
      date: new Date(), // Will be populated from Conversation table in future enhancement
      subject: result.subject,
      tags: result.tags,
    }));

    logger.info("Found relevant summaries", {
      userId,
      count: summaries.length,
      topScore: summaries[0]?.relevanceScore,
    });

    return summaries;
  } catch (error) {
    logger.error(
      "Failed to search relevant summaries",
      { userId, tierName },
      error,
    );
    // Return empty array on error (graceful degradation)
    return [];
  }
}
