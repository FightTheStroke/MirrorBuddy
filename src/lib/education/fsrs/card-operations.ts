/**
 * @file card-operations.ts
 * @brief FSRS card operations (create, review, etc.)
 */

import type { FSRSCard, Quality } from './types';
import { FSRS_INITIAL_STABILITY, FSRS_INITIAL_DIFFICULTY, FSRS_DESIRED_RETENTION } from './constants';
import { calculateRetrievability, calculateNewStability, calculateNewDifficulty, calculateNextInterval } from './core';

/**
 * Create a new flashcard with default FSRS parameters
 *
 * Initial state:
 * - Stability: 1.0 day
 * - Difficulty: 0.3 (moderate)
 * - No reviews or lapses
 * - Next review scheduled immediately
 *
 * @returns A new FSRSCard with initial values
 */
export function createCard(): FSRSCard {
  const now = new Date();

  return {
    stability: FSRS_INITIAL_STABILITY,
    difficulty: FSRS_INITIAL_DIFFICULTY,
    lastReview: now,
    nextReview: now, // Due immediately for first review
    lapses: 0,
    reps: 0,
  };
}

/**
 * Update a flashcard after a review session
 *
 * This is the main function that applies the FSRS algorithm:
 * 1. Calculates current retrievability
 * 2. Updates stability and difficulty based on quality
 * 3. Schedules next review
 * 4. Updates review counters
 *
 * @param card - The flashcard being reviewed
 * @param quality - Quality rating (1=again, 2=hard, 3=good, 4=easy)
 * @returns Updated card with new FSRS parameters
 */
export function reviewCard(card: FSRSCard, quality: Quality): FSRSCard {
  const now = new Date();

  // Calculate current retrievability
  const R = calculateRetrievability(card);

  // Update counters
  const newReps = card.reps + 1;
  const newLapses = quality === 1 ? card.lapses + 1 : card.lapses;

  // Calculate new FSRS parameters
  const newStability = calculateNewStability(
    card.stability,
    card.difficulty,
    R,
    quality,
    newLapses
  );

  const newDifficulty = calculateNewDifficulty(card.difficulty, quality);

  // Calculate next review time
  const hoursUntilNext = calculateNextInterval(newStability, FSRS_DESIRED_RETENTION);
  const nextReview = new Date(now.getTime() + hoursUntilNext * 60 * 60 * 1000);

  return {
    stability: newStability,
    difficulty: newDifficulty,
    lastReview: now,
    nextReview,
    lapses: newLapses,
    reps: newReps,
  };
}

/**
 * Get the next scheduled review date for a card
 *
 * @param card - The flashcard to check
 * @returns The scheduled review date
 */
export function getNextReviewDate(card: FSRSCard): Date {
  return card.nextReview;
}

/**
 * Check if a card is due for review
 *
 * @param card - The flashcard to check
 * @returns true if the card should be reviewed now
 */
export function isDue(card: FSRSCard): boolean {
  const now = new Date();
  return card.nextReview.getTime() <= now.getTime();
}

