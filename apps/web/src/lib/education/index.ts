/**
 * @file index.ts
 * @brief Education library exports
 */

export * from "./accessibility";
export { default as accessibility } from "./accessibility";

// FSRS - Free Spaced Repetition Scheduler
export {
  createCard,
  reviewCard,
  calculateRetrievability,
  getNextReviewDate,
  isDue,
  calculateStats,
  getDueCards,
  predictRetention,
  FSRS_CONSTANTS,
  type FSRSCard,
  type Quality,
  type FSRSStats,
} from "./fsrs";

// Adaptive Quiz - ONLY client-safe exports (difficulty calculation)
// Import from sub-modules to avoid pulling in adaptive-quiz.ts which re-exports server functions
export {
  calculateDifficultyAdjustment,
  selectQuestionsForDifficulty,
} from "./adaptive-quiz/difficulty";

export type {
  ReviewSuggestion,
  SeenConcept,
  DifficultyAdjustment,
  QuizAnalysis,
} from "./adaptive-quiz/types";

// Adaptive Difficulty - ONLY client-safe exports (no DB access)
// Import from sub-modules to avoid pulling in adaptive-difficulty.ts which has DB imports
export {
  isAdaptiveDifficultyMode,
  normalizeAdaptiveDifficultyMode,
  calculateAdaptiveContext,
  buildAdaptiveInstruction,
} from "./adaptive-difficulty-core";

export {
  createDefaultAdaptiveProfile,
  parseAdaptiveProfile,
} from "./adaptive-difficulty-profile";

export {
  sendAdaptiveSignals,
  buildSignalsFromText,
} from "./adaptive-difficulty-client";

// Accessibility - Dyscalculia support
export { formatNumberColored } from "./accessibility/dyscalculia";
