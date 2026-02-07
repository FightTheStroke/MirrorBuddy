/**
 * AI-Powered Learning Path Recommendation Engine
 *
 * Generates personalized learning recommendations based on:
 * - Conversation history and learned concepts
 * - FSRS flashcard performance
 * - Learning path progress
 * - Cross-maestro knowledge transfer
 *
 * Pro tier only feature (ADR 0065)
 *
 * Plan 104 - Wave 4: Pro Features [T4-05]
 */

import { logger } from "@/lib/logger";
// eslint-disable-next-line local-rules/enforce-dependency-direction -- Pro tier gating (ADR 0065)
import { tierService } from "@/lib/tier/server";
import type { TierName } from "@/types/tier-types";

// Re-export types and functions from sub-modules
export type { StudentInsights } from "./recommendation-insights";
export type { LearningRecommendation } from "./recommendation-scoring";

export {
  gatherStudentInsights,
  isEmptyInsights,
  identifyKnowledgeGaps,
  suggestFocusAreas,
} from "./recommendation-insights";

export {
  generateAIRecommendations,
  scoreLearningPattern,
  createEmptyRecommendation,
} from "./recommendation-scoring";

import {
  gatherStudentInsights,
  isEmptyInsights,
} from "./recommendation-insights";

import {
  generateAIRecommendations,
  createEmptyRecommendation,
  type LearningRecommendation,
} from "./recommendation-scoring";

/**
 * Generate AI-powered learning recommendations for a Pro user
 *
 * Main entry point for the recommendation engine
 *
 * @param userId User identifier
 * @returns Learning recommendations with AI scoring
 */
export async function generateRecommendations(
  userId: string,
): Promise<LearningRecommendation> {
  try {
    // Check tier access (Pro only)
    const tier = await tierService.getEffectiveTier(userId);
    const tierName = tier.code.toLowerCase() as TierName;

    if (tierName !== "pro") {
      logger.debug("Recommendations not available for non-Pro tier", {
        userId,
        tierName,
      });
      return createEmptyRecommendation();
    }

    // Gather student insights from multiple sources
    const insights = await gatherStudentInsights(userId);

    // If no data, return empty recommendation
    if (isEmptyInsights(insights)) {
      logger.debug("No data available for recommendations", { userId });
      return createEmptyRecommendation();
    }

    // Generate AI-scored recommendations
    const recommendations = await generateAIRecommendations(userId, insights);

    logger.info("Generated learning recommendations", {
      userId,
      overallScore: recommendations.overallScore,
      confidenceLevel: recommendations.confidenceLevel,
    });

    return recommendations;
  } catch (error) {
    logger.error("Failed to generate recommendations", { userId }, error);
    return createEmptyRecommendation();
  }
}
