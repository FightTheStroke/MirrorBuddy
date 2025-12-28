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
