/**
 * Gamification Helper Functions
 * Utility calculations for points, levels, and tiers
 */

/**
 * Season calculation
 */
export function getCurrentSeason(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

/**
 * Level calculation: 1000 MirrorBucks per level, max 100 per season
 */
export function calculateLevel(points: number): number {
  return Math.min(100, Math.floor(points / 1000) + 1);
}

/**
 * Tier based on level
 */
export function calculateTier(level: number): string {
  if (level >= 90) return 'leggenda';
  if (level >= 75) return 'maestro';
  if (level >= 60) return 'esperto';
  if (level >= 45) return 'avanzato';
  if (level >= 30) return 'intermedio';
  if (level >= 15) return 'apprendista';
  return 'principiante';
}

/**
 * Calculate streak multiplier based on consecutive days
 */
export function calculateStreakMultiplier(currentStreak: number): number {
  if (currentStreak >= 7) return 1.5;
  if (currentStreak >= 3) return 1.25;
  if (currentStreak >= 1) return 1.1;
  return 1.0;
}

/**
 * Check if achievement requirement is met
 */
export function checkAchievementRequirement(
  requirement: { type: string; value: number },
  stats: { totalPoints: number; level: number; currentStreak: number }
): boolean {
  switch (requirement.type) {
    case 'total_points':
      return stats.totalPoints >= requirement.value;
    case 'level':
      return stats.level >= requirement.value;
    case 'streak':
      return stats.currentStreak >= requirement.value;
    case 'first_session':
      return stats.totalPoints > 0;
    default:
      return false;
  }
}
