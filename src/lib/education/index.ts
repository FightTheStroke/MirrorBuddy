/**
 * @file index.ts
 * @brief Education library exports
 */

export * from './accessibility';
export { default as accessibility } from './accessibility';

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
} from './fsrs';

// Adaptive Quiz - Review suggestions, seen concepts, difficulty adjustment
export {
  analyzeQuizPerformance,
  generateReviewSuggestions,
  checkSeenConcepts,
  calculateDifficultyAdjustment,
  selectQuestionsForDifficulty,
  type ReviewSuggestion,
  type SeenConcept,
  type DifficultyAdjustment,
  type QuizAnalysis,
} from './adaptive-quiz';

// Adaptive Difficulty - Signals, profiles, context building
export {
  loadAdaptiveProfile,
  saveAdaptiveProfile,
  recordAdaptiveSignal,
  getAdaptiveContextForUser,
  recordAdaptiveSignalsBatch,
  isAdaptiveDifficultyMode,
  normalizeAdaptiveDifficultyMode,
  calculateAdaptiveContext,
  buildAdaptiveInstruction,
  createDefaultAdaptiveProfile,
  parseAdaptiveProfile,
} from './adaptive-difficulty';

export {
  sendAdaptiveSignals,
  buildSignalsFromText,
} from './adaptive-difficulty-client';

// Recommendation Engine
export {
  generateRecommendations,
  type LearningRecommendation,
} from './recommendation-engine';

// Accessibility - Dyscalculia support
export {
  formatNumberColored,
} from './accessibility/dyscalculia';
