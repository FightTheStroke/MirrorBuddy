/**
 * @file stats.ts
 * @brief FSRS statistics and utilities
 */

import type { FSRSCard, FSRSStats } from './types';
import { FSRS_DECAY_SHARPNESS } from './constants';
import { calculateRetrievability } from './core';

/**
 * Calculate statistics for a collection of cards
 *
 * @param cards - Array of flashcards to analyze
 * @returns Statistics object with performance metrics
 */
export function calculateStats(cards: FSRSCard[]): FSRSStats {
  if (cards.length === 0) {
    return {
      totalCards: 0,
      cardsDue: 0,
      cardsMastered: 0,
      avgStability: 0,
      avgDifficulty: 0,
      predictedRetention: 0,
    };
  }

  const now = new Date();
  let totalStability = 0;
  let totalDifficulty = 0;
  let totalRetention = 0;
  let cardsDue = 0;
  let cardsMastered = 0;

  for (const card of cards) {
    totalStability += card.stability;
    totalDifficulty += card.difficulty;
    totalRetention += calculateRetrievability(card);

    if (card.nextReview.getTime() <= now.getTime()) {
      cardsDue++;
    }

    if (card.stability > 30) {
      cardsMastered++;
    }
  }

  return {
    totalCards: cards.length,
    cardsDue,
    cardsMastered,
    avgStability: totalStability / cards.length,
    avgDifficulty: totalDifficulty / cards.length,
    predictedRetention: totalRetention / cards.length,
  };
}

/**
 * Get cards that are due for review, sorted by priority
 *
 * Cards are sorted by next review date (earliest first)
 *
 * @param cards - Array of all flashcards
 * @param limit - Maximum number of cards to return (optional)
 * @returns Array of cards due for review
 */
export function getDueCards(cards: FSRSCard[], limit?: number): FSRSCard[] {
  const now = new Date();
  const dueCards = cards
    .filter(card => card.nextReview.getTime() <= now.getTime())
    .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());

  return limit ? dueCards.slice(0, limit) : dueCards;
}

/**
 * Predict retention rate at a future date
 *
 * @param card - The flashcard to predict for
 * @param futureDate - Date to predict retention at
 * @returns Predicted probability of recall (0.0 to 1.0)
 */
export function predictRetention(card: FSRSCard, futureDate: Date): number {
  const daysElapsed = (futureDate.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24);

  if (card.stability <= 0 || daysElapsed < 0) {
    return 1.0;
  }

  const r = Math.pow(1.0 + daysElapsed / (9.0 * card.stability), -1.0 / FSRS_DECAY_SHARPNESS);
  return Math.max(0.0, Math.min(1.0, r));
}

