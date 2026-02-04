/**
 * Centralized XP Reward Values
 * Single source of truth for all XP-related constants across the application.
 *
 * Used by:
 * - pomodoro-header-widget.tsx (Pomodoro rewards)
 * - maestro-session.tsx (Session XP)
 * - flashcard-tool.tsx (Flashcard XP)
 * - xp-info.tsx (Display component)
 * - app-store.ts, page.tsx, home-progress-widget.tsx (Level progression)
 */

// ============================================================================
// Level Progression
// ============================================================================

/**
 * XP thresholds for each level.
 * Index = level number (0-indexed), value = total XP needed to reach that level.
 */
export const XP_PER_LEVEL = [
  0, // Level 1
  100, // Level 2
  250, // Level 3
  500, // Level 4
  1000, // Level 5
  2000, // Level 6
  4000, // Level 7
  8000, // Level 8
  16000, // Level 9
  32000, // Level 10
  64000, // Level 11 (max)
] as const;

// ============================================================================
// Pomodoro XP
// ============================================================================

/**
 * XP rewards for Pomodoro timer completion.
 */
export const POMODORO_XP = {
  /** XP earned for completing a single pomodoro session */
  SINGLE: 15,
  /** Bonus XP for completing a full cycle (4 pomodoros) */
  CYCLE_BONUS: 15,
  /** Bonus XP for the first pomodoro of the day */
  FIRST_OF_DAY: 10,
} as const;

// ============================================================================
// Maestri Session XP
// ============================================================================

/**
 * XP rewards for AI Maestri chat sessions.
 */
export const MAESTRI_XP = {
  /** XP earned per minute of conversation */
  PER_MINUTE: 5,
  /** XP earned for each question asked */
  PER_QUESTION: 10,
  /** Maximum XP that can be earned in a single session */
  MAX_PER_SESSION: 100,
} as const;

// ============================================================================
// Flashcard XP
// ============================================================================

/**
 * XP rewards based on flashcard rating.
 * Maps to FSRS quality ratings (1-4).
 */
export const FLASHCARD_XP = {
  /** Rating 1: Need more review */
  AGAIN: 2,
  /** Rating 2: Remembered with difficulty */
  HARD: 5,
  /** Rating 3: Remembered correctly */
  GOOD: 10,
  /** Rating 4: Remembered very easily */
  EASY: 15,
} as const;

/**
 * XP rewards indexed by rating string.
 * For use in components that need Record<Rating, number> type.
 */
export const FLASHCARD_XP_BY_RATING: Record<
  "again" | "hard" | "good" | "easy",
  number
> = {
  again: FLASHCARD_XP.AGAIN,
  hard: FLASHCARD_XP.HARD,
  good: FLASHCARD_XP.GOOD,
  easy: FLASHCARD_XP.EASY,
};

// ============================================================================
// Independence XP (Amodei 2026)
// Reference: Professors' Constitution Article II & IV
// ============================================================================

/**
 * XP rewards for independence behaviors.
 * Encourages human relationships over AI dependency.
 */
export const INDEPENDENCE_XP = {
  /** XP for solving a problem independently before asking AI */
  SOLVED_INDEPENDENTLY: 25,
  /** XP for mentioning getting help from parent/teacher */
  HUMAN_HELP_MENTION: 15,
  /** XP for mentioning studying with classmates */
  STUDY_GROUP_MENTION: 15,
  /** Daily bonus for balanced AI usage (<60 min) */
  BALANCED_USAGE_BONUS: 20,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate XP needed to reach the next level.
 * @param currentLevel - Current player level (1-indexed)
 * @returns XP needed for next level, or null if at max level
 */
export function getXPForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= XP_PER_LEVEL.length) return null;
  return XP_PER_LEVEL[currentLevel];
}

/**
 * Calculate current level based on total XP.
 * @param totalXP - Total accumulated XP
 * @returns Current level (1-indexed)
 */
export function calculateLevel(totalXP: number): number {
  for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
    if (totalXP >= XP_PER_LEVEL[i]) {
      return i + 1;
    }
  }
  return 1;
}
