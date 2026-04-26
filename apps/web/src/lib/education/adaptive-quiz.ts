/**
 * Adaptive Quiz Service
 * Handles quiz review suggestions, seen concept tracking, and difficulty adjustment
 *
 * Plan 9 - Wave 4 [F-18, F-19, F-20]
 *
 * @module education/adaptive-quiz
 */

// Re-export all from modular files
export type {
  ReviewSuggestion,
  SeenConcept,
  DifficultyAdjustment,
  QuizAnalysis,
} from './adaptive-quiz/types';

export {
  REVIEW_THRESHOLD,
  MASTERY_THRESHOLD,
  MIN_QUESTIONS_FOR_ANALYSIS,
} from './adaptive-quiz/types';

export {
  analyzeQuizPerformance,
  generateReviewSuggestions,
} from './adaptive-quiz/analysis';

export { checkSeenConcepts } from './adaptive-quiz/concepts';

export {
  calculateDifficultyAdjustment,
  selectQuestionsForDifficulty,
} from './adaptive-quiz/difficulty';
