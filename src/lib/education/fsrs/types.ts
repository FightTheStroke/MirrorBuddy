/**
 * @file types.ts
 * @brief Types and interfaces for FSRS
 */

/**
 * Quality rating for a review session
 * 1 = Again (forgot) - card will be shown again soon
 * 2 = Hard - remembered with difficulty
 * 3 = Good - remembered correctly
 * 4 = Easy - remembered very easily
 */
export type Quality = 1 | 2 | 3 | 4;

/**
 * FSRS flashcard state
 */
export interface FSRSCard {
  /** Stability: days until 90% forgetting probability */
  stability: number;

  /** Difficulty: 0 (easy) to 1 (hard) */
  difficulty: number;

  /** Last review timestamp */
  lastReview: Date;

  /** Next scheduled review timestamp */
  nextReview: Date;

  /** Number of times the card was forgotten */
  lapses: number;

  /** Total number of reviews */
  reps: number;
}

/**
 * Statistics for FSRS performance tracking
 */
export interface FSRSStats {
  totalCards: number;
  cardsDue: number;
  cardsMastered: number; // stability > 30 days
  avgStability: number;
  avgDifficulty: number;
  predictedRetention: number;
}

