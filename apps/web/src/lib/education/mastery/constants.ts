/**
 * @file constants.ts
 * @brief Constants for mastery learning
 */

export const MASTERY_THRESHOLD = 0.80; // 80% = mastered
export const PROFICIENT_THRESHOLD = 0.60; // 60% = proficient
export const FAMILIAR_THRESHOLD = 0.40; // 40% = familiar
export const ATTEMPTS_FOR_MASTERY = 5; // Minimum attempts needed

// Difficulty adjustment factors
export const DIFFICULTY_INCREASE = 1.15;
export const DIFFICULTY_DECREASE = 0.85;
export const MIN_DIFFICULTY = 0.5;
export const MAX_DIFFICULTY = 2.0;

