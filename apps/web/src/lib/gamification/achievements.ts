/**
 * Achievement Utilities and Condition Checking
 * Handles achievement tracking and condition validation
 */

import type { Achievement } from '@/types';
import { ACHIEVEMENTS } from './achievements-data';

// Re-export for convenience
export { ACHIEVEMENTS } from './achievements-data';

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  category: Achievement['category']
): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * State shape for achievement condition checking
 */
interface AchievementCheckState {
  sessionHistory?: unknown[];
  quizzesCompleted?: number;
  mindmapsCreated?: number;
  flashcardDecksCreated?: number;
  streak?: { current?: number };
  seasonLevel?: number;
  totalStudyMinutes?: number;
}

/**
 * Check if achievement conditions are met
 * This is a helper function that can be extended with more complex logic
 */
export function checkAchievementCondition(
  achievementId: string,
  state: AchievementCheckState
): boolean {
  const achievement = getAchievementById(achievementId);
  if (!achievement) return false;

  // Simple condition checks based on achievement ID
  // In a real implementation, you'd have more sophisticated checks
  switch (achievementId) {
    case 'first_chat':
      return (state.sessionHistory?.length ?? 0) >= 1;
    case 'first_quiz':
      return (state.quizzesCompleted ?? 0) >= 1;
    case 'first_mindmap':
      return (state.mindmapsCreated ?? 0) >= 1;
    case 'first_flashcards':
      return (state.flashcardDecksCreated ?? 0) >= 1;
    case 'streak_3':
      return (state.streak?.current ?? 0) >= 3;
    case 'streak_7':
      return (state.streak?.current ?? 0) >= 7;
    case 'streak_30':
      return (state.streak?.current ?? 0) >= 30;
    case 'streak_100':
      return (state.streak?.current ?? 0) >= 100;
    case 'level_10':
      return (state.seasonLevel ?? 0) >= 10;
    case 'level_50':
      return (state.seasonLevel ?? 0) >= 50;
    case 'level_100':
      return (state.seasonLevel ?? 0) >= 100;
    case 'hour_studied':
      return (state.totalStudyMinutes ?? 0) >= 60;
    case 'ten_hours_studied':
      return (state.totalStudyMinutes ?? 0) >= 600;
    default:
      return false;
  }
}
