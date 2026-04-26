/**
 * Centralized MirrorBucks System Constants
 * Single source of truth for all MirrorBucks-related values.
 *
 * MirrorBucks replace the XP system with a Fortnite/Duolingo-style progression.
 * 100 levels per season, with seasons resetting quarterly.
 */

// ============================================================================
// Level Progression - 100 Levels per Season
// ============================================================================

/**
 * MirrorBucks thresholds for each level (1-100).
 * Progressive difficulty curve:
 * - Levels 1-10: Easy ramp-up (100-600 MB)
 * - Levels 11-30: Normal progression (700-1600 MB)
 * - Levels 31-100: Progressive curve with increasing requirements
 */
export const MIRRORBUCKS_PER_LEVEL: number[] = (() => {
  const levels: number[] = [0]; // Level 1 starts at 0

  // Levels 1-10: Easy ramp-up (100 MB increments)
  for (let i = 1; i <= 10; i++) {
    levels.push(i * 100);
  }

  // Levels 11-30: Normal progression (50 MB increments)
  for (let i = 11; i <= 30; i++) {
    levels.push(levels[i - 1] + 50);
  }

  // Levels 31-100: Progressive curve (exponential growth)
  for (let i = 31; i <= 100; i++) {
    const increment = Math.floor(50 + (i - 30) * 10);
    levels.push(levels[i - 1] + increment);
  }

  return levels;
})();

// ============================================================================
// MirrorBucks Rewards
// ============================================================================

/**
 * MirrorBucks rewards for different activities.
 */
export const MIRRORBUCKS_REWARDS = {
  // Pomodoro
  POMODORO_SINGLE: 15,
  POMODORO_CYCLE_BONUS: 15,
  POMODORO_FIRST_OF_DAY: 10,

  // Maestri Sessions
  MAESTRI_PER_MINUTE: 5,
  MAESTRI_PER_QUESTION: 10,
  MAESTRI_MAX_PER_SESSION: 100,

  // Flashcards
  FLASHCARD_AGAIN: 2,
  FLASHCARD_HARD: 5,
  FLASHCARD_GOOD: 10,
  FLASHCARD_EASY: 15,

  // Achievements
  ACHIEVEMENT_ONBOARDING: 50,
  ACHIEVEMENT_STREAK_3: 100,
  ACHIEVEMENT_STREAK_7: 250,
  ACHIEVEMENT_STREAK_30: 1000,
  ACHIEVEMENT_LEVEL_MILESTONE: 500,
  ACHIEVEMENT_EXPLORATION: 200,
  ACHIEVEMENT_TIME_BASED: 150,

  // Daily/Weekly
  DAILY_LOGIN: 10,
  WEEKLY_GOAL_BONUS: 200,
} as const;

/**
 * MirrorBucks rewards indexed by flashcard rating.
 */
export const MIRRORBUCKS_BY_FLASHCARD_RATING: Record<
  'again' | 'hard' | 'good' | 'easy',
  number
> = {
  again: MIRRORBUCKS_REWARDS.FLASHCARD_AGAIN,
  hard: MIRRORBUCKS_REWARDS.FLASHCARD_HARD,
  good: MIRRORBUCKS_REWARDS.FLASHCARD_GOOD,
  easy: MIRRORBUCKS_REWARDS.FLASHCARD_EASY,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate MirrorBucks needed to reach the next level.
 * @param currentLevel - Current player level (1-100)
 * @returns MirrorBucks needed for next level, or null if at max level
 */
export function getMirrorBucksForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= 100) return null;
  return MIRRORBUCKS_PER_LEVEL[currentLevel];
}

/**
 * Calculate current level based on total MirrorBucks in a season.
 * @param mirrorBucks - Total accumulated MirrorBucks in current season
 * @returns Current level (1-100)
 */
export function calculateSeasonLevel(mirrorBucks: number): number {
  for (let i = MIRRORBUCKS_PER_LEVEL.length - 1; i >= 0; i--) {
    if (mirrorBucks >= MIRRORBUCKS_PER_LEVEL[i]) {
      return Math.min(i, 100);
    }
  }
  return 1;
}

/**
 * Calculate progress to next level as a percentage.
 * @param currentLevel - Current level (1-100)
 * @param currentMirrorBucks - Current MirrorBucks in season
 * @returns Percentage (0-100) of progress to next level
 */
export function getLevelProgress(
  currentLevel: number,
  currentMirrorBucks: number
): number {
  if (currentLevel >= 100) return 100;

  const currentLevelThreshold = MIRRORBUCKS_PER_LEVEL[currentLevel - 1];
  const nextLevelThreshold = MIRRORBUCKS_PER_LEVEL[currentLevel];
  const progress = currentMirrorBucks - currentLevelThreshold;
  const required = nextLevelThreshold - currentLevelThreshold;

  return Math.min(100, Math.max(0, (progress / required) * 100));
}

/**
 * Get MirrorBucks remaining to next level.
 * @param currentLevel - Current level (1-100)
 * @param currentMirrorBucks - Current MirrorBucks in season
 * @returns MirrorBucks remaining, or 0 if at max level
 */
export function getMirrorBucksToNextLevel(
  currentLevel: number,
  currentMirrorBucks: number
): number {
  if (currentLevel >= 100) return 0;

  const nextLevelThreshold = MIRRORBUCKS_PER_LEVEL[currentLevel];
  return Math.max(0, nextLevelThreshold - currentMirrorBucks);
}
