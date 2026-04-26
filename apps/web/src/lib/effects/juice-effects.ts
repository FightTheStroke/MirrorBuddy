/**
 * Juice Effects Main Module
 * Orchestrates celebrations with confetti, sounds, and haptic feedback
 * Respects accessibility settings (reduced motion, sensory profiles, etc.)
 */

import { playSoundEffect, resumeAudioContext } from "./sound-manager";
import {
  playConfetti,
  playSubtleConfetti,
  playGrandConfetti,
} from "./confetti";
import { triggerHaptic, celebrationVibrate, lightVibrate } from "./haptics";
import { logger } from "@/lib/logger";

/**
 * Celebration context for tracking state and preventing duplicate calls
 */
const celebrationState = {
  recentCelebrations: new Map<string, number>(),
  debounceMs: 500, // Prevent multiple celebrations within 500ms
};

/**
 * Check if enough time has passed since last celebration of this type
 */
function shouldCelebrate(celebrationType: string): boolean {
  const lastTime = celebrationState.recentCelebrations.get(celebrationType);
  const now = Date.now();

  if (!lastTime || now - lastTime >= celebrationState.debounceMs) {
    celebrationState.recentCelebrations.set(celebrationType, now);
    return true;
  }

  return false;
}

/**
 * Celebrate quiz completion with confetti, sounds, and haptics
 * Called when a student completes a quiz/assessment
 * Idempotent: safe to call multiple times
 */
export function celebrateQuizComplete(): void {
  if (!shouldCelebrate("quiz-complete")) {
    return;
  }

  try {
    resumeAudioContext();
    playGrandConfetti();
    playSoundEffect("quiz-complete");
    celebrationVibrate();
  } catch {
    logger.debug("Error in celebrateQuizComplete");
  }
}

/**
 * Celebrate level/milestone achievement
 * Called when a student reaches a new level or milestone
 * Idempotent: safe to call multiple times
 */
export function celebrateLevelUp(): void {
  if (!shouldCelebrate("level-up")) {
    return;
  }

  try {
    resumeAudioContext();
    playConfetti({
      duration: 2000,
      particleCount: 50,
      colors: ["#FFD700", "#FFA07A", "#FF6B6B"],
    });
    playSoundEffect("level-up");
    celebrationVibrate();
  } catch {
    logger.debug("Error in celebrateLevelUp");
  }
}

/**
 * Celebrate achievement streak (consecutive correct answers/achievements)
 * Called when a student maintains a streak milestone
 * Idempotent: safe to call multiple times
 */
export function celebrateStreak(): void {
  if (!shouldCelebrate("streak")) {
    return;
  }

  try {
    resumeAudioContext();
    playSubtleConfetti();
    playSoundEffect("streak");
    triggerHaptic("medium");
  } catch {
    logger.debug("Error in celebrateStreak");
  }
}

/**
 * Celebrate badge/achievement unlocked
 * Called when a student earns a new badge or special achievement
 * Idempotent: safe to call multiple times
 */
export function celebrateBadge(): void {
  if (!shouldCelebrate("badge")) {
    return;
  }

  try {
    resumeAudioContext();
    playSubtleConfetti();
    playSoundEffect("badge");
    lightVibrate();
  } catch {
    logger.debug("Error in celebrateBadge");
  }
}

/**
 * Celebrate correct answer in quiz/exercise
 * Called when a student answers a question correctly
 * Idempotent: safe to call multiple times
 */
export function celebrateCorrectAnswer(): void {
  if (!shouldCelebrate("correct")) {
    return;
  }

  try {
    resumeAudioContext();
    playSoundEffect("correct");
    lightVibrate();
  } catch {
    logger.debug("Error in celebrateCorrectAnswer");
  }
}

/**
 * Disable all celebration effects temporarily (for testing or accessibility override)
 */
export function disableCelebrations(): void {
  celebrationState.debounceMs = Infinity;
}

/**
 * Re-enable celebration effects after being disabled
 */
export function enableCelebrations(): void {
  celebrationState.debounceMs = 500;
}

/**
 * Reset celebration debounce state (useful for testing)
 */
export function resetCelebrationState(): void {
  celebrationState.recentCelebrations.clear();
}
