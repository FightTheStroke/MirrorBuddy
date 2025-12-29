/**
 * CONVERGIO EDUCATION - FSRS (Free Spaced Repetition Scheduler)
 *
 * TypeScript implementation of the FSRS algorithm (2024 version) for optimal
 * spaced repetition scheduling based on Duolingo's research.
 *
 * Algorithm: Stability = S * (11^D - 1) * e^(k*(1-R)) * e^(0.2*t) * e^(-0.1*lapse)
 *
 * Phase: FASE 11 - Learning Science
 *
 * Copyright (c) 2025 Convergio.io
 * Licensed under MIT License
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const FSRS_INITIAL_STABILITY = 1.0;
const FSRS_INITIAL_DIFFICULTY = 0.3;
const FSRS_DESIRED_RETENTION = 0.9;
const FSRS_K_FACTOR = 19.0; // Controls stability growth rate
const FSRS_DECAY_SHARPNESS = 0.95; // Power law decay parameter

// Quality bounds
const MIN_STABILITY_DAYS = 0.04; // 1 hour minimum
const MAX_STABILITY_DAYS = 1095; // 3 years maximum
const MAX_INTERVAL_HOURS = 365 * 24; // 1 year maximum

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CORE FSRS ALGORITHM
// ============================================================================

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
function calculateNewStability(
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
function calculateNewDifficulty(D: number, quality: Quality): number {
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
function calculateNextInterval(
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

// ============================================================================
// PUBLIC API
// ============================================================================

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

/**
 * Export constants for external use
 */
export const FSRS_CONSTANTS = {
  INITIAL_STABILITY: FSRS_INITIAL_STABILITY,
  INITIAL_DIFFICULTY: FSRS_INITIAL_DIFFICULTY,
  DESIRED_RETENTION: FSRS_DESIRED_RETENTION,
  MIN_STABILITY_DAYS,
  MAX_STABILITY_DAYS,
} as const;
