/**
 * @file server.ts
 * @brief Education library exports - SERVER-ONLY
 *
 * This module re-exports all client-safe symbols from index.ts
 * and adds server-only exports that depend on:
 * - @/lib/db (database access)
 * - @/lib/tier/server (tier service)
 * - @/lib/rag (which has server deps)
 */

// Re-export all client-safe symbols
export * from "./index";

// Server-only exports from adaptive-quiz
// These use hybridSearch from @/lib/rag which has DB dependencies
export {
  analyzeQuizPerformance,
  generateReviewSuggestions,
  checkSeenConcepts,
  type ReviewSuggestion,
  type SeenConcept,
  type DifficultyAdjustment,
  type QuizAnalysis,
} from "./adaptive-quiz";

// Server-only exports from adaptive-difficulty
// These use @/lib/db directly
export {
  loadAdaptiveProfile,
  saveAdaptiveProfile,
  recordAdaptiveSignal,
  getAdaptiveContextForUser,
  recordAdaptiveSignalsBatch,
} from "./adaptive-difficulty";

// Server-only exports from recommendation-engine
// Uses @/lib/tier/server (tierService)
export {
  generateRecommendations,
  type LearningRecommendation,
} from "./recommendation-engine";
