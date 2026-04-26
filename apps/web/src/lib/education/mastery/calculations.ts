/**
 * @file calculations.ts
 * @brief Mastery calculation functions
 */

import { SkillStatus } from './types';
import {
  MASTERY_THRESHOLD,
  PROFICIENT_THRESHOLD,
  FAMILIAR_THRESHOLD,
  ATTEMPTS_FOR_MASTERY,
  DIFFICULTY_INCREASE,
  DIFFICULTY_DECREASE,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
} from './constants';

/**
 * Calculate mastery level from attempts and correct answers
 * Uses weighted average favoring recent attempts
 */
export function calculateMastery(
  attempts: number,
  correct: number,
  prevMastery: number
): number {
  if (attempts <= 0) return 0;

  // Simple ratio for new skills
  const simpleRatio = correct / attempts;

  // Weighted average with previous mastery (momentum)
  const weight = Math.min(attempts / ATTEMPTS_FOR_MASTERY, 1.0);
  const mastery = weight * simpleRatio + (1.0 - weight) * prevMastery;

  return Math.max(0, Math.min(1.0, mastery));
}

/**
 * Determine skill status from mastery level
 */
export function statusFromMastery(mastery: number, attempts: number): SkillStatus {
  if (attempts < ATTEMPTS_FOR_MASTERY && mastery < MASTERY_THRESHOLD) {
    return SkillStatus.ATTEMPTED;
  }
  if (mastery >= MASTERY_THRESHOLD) return SkillStatus.MASTERED;
  if (mastery >= PROFICIENT_THRESHOLD) return SkillStatus.PROFICIENT;
  if (mastery >= FAMILIAR_THRESHOLD) return SkillStatus.FAMILIAR;
  if (attempts > 0) return SkillStatus.ATTEMPTED;
  return SkillStatus.NOT_STARTED;
}

/**
 * Adjust difficulty based on performance
 */
export function adjustDifficulty(currentDifficulty: number, wasCorrect: boolean): number {
  let newDifficulty = currentDifficulty;

  if (wasCorrect) {
    newDifficulty *= DIFFICULTY_INCREASE;
  } else {
    newDifficulty *= DIFFICULTY_DECREASE;
  }

  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, newDifficulty));
}

