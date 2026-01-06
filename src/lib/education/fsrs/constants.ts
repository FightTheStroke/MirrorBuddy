/**
 * @file constants.ts
 * @brief FSRS constants
 */

export const FSRS_INITIAL_STABILITY = 1.0;
export const FSRS_INITIAL_DIFFICULTY = 0.3;
export const FSRS_DESIRED_RETENTION = 0.9;
export const FSRS_K_FACTOR = 19.0; // Controls stability growth rate
export const FSRS_DECAY_SHARPNESS = 0.95; // Power law decay parameter

// Quality bounds
export const MIN_STABILITY_DAYS = 0.04; // 1 hour minimum
export const MAX_STABILITY_DAYS = 1095; // 3 years maximum
export const MAX_INTERVAL_HOURS = 365 * 24; // 1 year maximum

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

