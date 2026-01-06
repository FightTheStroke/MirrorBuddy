/**
 * @file index.ts
 * @brief Re-exports for FSRS module
 * Maintains backward compatibility with existing imports
 */

// Types
export type { Quality, FSRSCard, FSRSStats } from './types';

// Constants
export { FSRS_CONSTANTS } from './constants';

// Core functions
export { calculateRetrievability } from './core';

// Card operations
export {
  createCard,
  reviewCard,
  getNextReviewDate,
  isDue,
} from './card-operations';

// Statistics
export {
  calculateStats,
  getDueCards,
  predictRetention,
} from './stats';

