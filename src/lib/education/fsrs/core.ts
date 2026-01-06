/**
 * @file core.ts
 * @brief Core FSRS algorithm functions
 */

import type { FSRSCard, Quality } from './types';
import {
  FSRS_K_FACTOR,
  FSRS_DECAY_SHARPNESS,
  FSRS_DESIRED_RETENTION,
  MIN_STABILITY_DAYS,
  MAX_STABILITY_DAYS,
  MAX_INTERVAL_HOURS,
} from './constants';

/**
 * Calculate retrievability (probability of recall) based on elapsed time
 *
 * Formula: R(t) = (1 + t/(9*S))^(-1/w)
 * where:
 *   - t = days elapsed since last review
 *   - S = stability (days until 90% forgetting)
 *   - w = decay sharpness parameter (0.95)
 *
 * @param card - The flashcard to calculate retrievability for
 * @returns Probability of recall (0.0 to 1.0)
 */
export function calculateRetrievability(card: FSRSCard): number {
  const now = new Date();
  const daysElapsed = (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24);

  if (card.stability <= 0 || daysElapsed < 0) {
    return 1.0;
  }

  // Power law decay with stability as the time constant
  const r = Math.pow(1.0 + daysElapsed / (9.0 * card.stability), -1.0 / FSRS_DECAY_SHARPNESS);

  // Clamp to [0, 1]
  return Math.max(0.0, Math.min(1.0, r));
}

/**
 * Calculate new stability based on review quality
 *
 * Uses FSRS-5 algorithm with quality-based modifiers:
 * - Again (1): Stability reduced to 30% with difficulty penalty
 * - Hard (2): 60% of calculated stability
 * - Good (3): 85% of calculated stability
 * - Easy (4): 130% of calculated stability
 *
 * @param S - Current stability
 * @param D - Current difficulty
 * @param R - Current retrievability
 * @param quality - Quality rating (1-4)
 * @param lapses - Number of times forgotten
 * @returns New stability value
 */
export function calculateNewStability(
  S: number,
  D: number,
  R: number,
  quality: Quality,
  lapses: number
): number {
  // Quality 1 (Again/Forgot) - significantly reduce stability
  if (quality === 1) {
    const newS = S * 0.3 * Math.pow(11.0, D - 1.0);
    return Math.max(MIN_STABILITY_DAYS, Math.min(MAX_STABILITY_DAYS, newS));
  }

  // FSRS formula for successful recall
  const k = FSRS_K_FACTOR;
  const base = 11.0;

  let stability = S * (Math.pow(base, D) - 1.0) *
                  Math.exp(k * (1.0 - R)) *
                  Math.exp(0.2 * S) *
                  Math.exp(-0.1 * lapses);

  // Apply quality modifiers
  switch (quality) {
    case 2: // Hard
      stability *= 0.6;
      break;
    case 3: // Good
      stability *= 0.85;
      break;
    case 4: // Easy
      stability *= 1.3;
      break;
  }

  // Clamp to reasonable bounds (1 hour to 3 years)
  return Math.max(MIN_STABILITY_DAYS, Math.min(MAX_STABILITY_DAYS, stability));
}

/**
 * Calculate new difficulty based on review quality
 *
 * Difficulty adjusts based on performance:
 * - Again (1): +0.1 (harder)
 * - Hard (2): +0.05
 * - Good (3): -0.03
 * - Easy (4): -0.07 (easier)
 *
 * Includes mean reversion toward 0.3
 *
 * @param D - Current difficulty
 * @param quality - Quality rating (1-4)
 * @returns New difficulty value (0.0 to 1.0)
 */
export function calculateNewDifficulty(D: number, quality: Quality): number {
  let delta = 0.0;

  switch (quality) {
    case 1: // Again
      delta = 0.1;
      break;
    case 2: // Hard
      delta = 0.05;
      break;
    case 3: // Good
      delta = -0.03;
      break;
    case 4: // Easy
      delta = -0.07;
      break;
  }

  // Mean reversion toward 0.3
  const newD = D + delta + 0.05 * (0.3 - D);

  // Clamp to [0, 1]
  return Math.max(0.0, Math.min(1.0, newD));
}

/**
 * Calculate optimal interval until next review
 *
 * Solves R(t) = desired_retention for t:
 * t = S * ((1/R)^w - 1) * 9
 *
 * @param stability - Current stability in days
 * @param desiredRetention - Target retention rate (default 0.9)
 * @returns Hours until next review
 */
export function calculateNextInterval(
  stability: number,
  desiredRetention: number = FSRS_DESIRED_RETENTION
): number {
  const w = FSRS_DECAY_SHARPNESS;
  const days = stability * (Math.pow(1.0 / desiredRetention, w) - 1.0) * 9.0;

  // Convert to hours and clamp
  let hours = Math.floor(days * 24.0);
  hours = Math.max(1, Math.min(MAX_INTERVAL_HOURS, hours));

  return hours;
}

