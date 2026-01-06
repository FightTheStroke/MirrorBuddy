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
