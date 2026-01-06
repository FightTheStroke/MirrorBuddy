/**
 * @file motor.ts
 * @brief Cerebral Palsy support functions (CP01-05)
 */

import type { AccessibilityProfile } from './types';
import { Severity, InputMethod } from './types';

/**
 * Get timeout multiplier for motor impairment
 * CP01: 2x-3x more time for inputs
 */
export function getTimeoutMultiplier(profile: AccessibilityProfile): number {
  if (!profile.cerebralPalsy) {
    return 1.0;
  }

  switch (profile.cerebralPalsySeverity) {
    case Severity.SEVERE:
      return 3.0;
    case Severity.MODERATE:
      return 2.5;
    case Severity.MILD:
      return 2.0;
    default:
      return 1.0;
  }
}

/**
 * Get adjusted timeout in milliseconds
 * CP02: Apply multiplier to base timeout
 */
export function getAdjustedTimeout(profile: AccessibilityProfile, baseTimeout: number): number {
  return baseTimeout * getTimeoutMultiplier(profile);
}

/**
 * Check if voice input should be preferred
 * CP03: Voice input for severe motor impairment
 */
export function shouldUseVoiceInput(profile: AccessibilityProfile): boolean {
  if (!profile.cerebralPalsy) {
    return false;
  }

  return (
    profile.cerebralPalsySeverity >= Severity.MODERATE ||
    profile.preferredInput === InputMethod.VOICE ||
    profile.preferredInput === InputMethod.BOTH
  );
}

/**
 * Check if break should be suggested based on fatigue
 * CP04: More frequent breaks for motor fatigue
 */
export function shouldSuggestBreak(profile: AccessibilityProfile, minutesElapsed: number): boolean {
  if (!profile.cerebralPalsy) {
    return minutesElapsed >= 30;
  }

  switch (profile.cerebralPalsySeverity) {
    case Severity.SEVERE:
      return minutesElapsed >= 10;
    case Severity.MODERATE:
      return minutesElapsed >= 15;
    case Severity.MILD:
      return minutesElapsed >= 20;
    default:
      return minutesElapsed >= 30;
  }
}

/**
 * Get recommended input method
 * CP05: Suggest best input based on severity
 */
export function getRecommendedInputMethod(profile: AccessibilityProfile): InputMethod {
  if (!profile.cerebralPalsy) {
    return InputMethod.KEYBOARD;
  }

  if (profile.cerebralPalsySeverity >= Severity.SEVERE) {
    return InputMethod.VOICE;
  } else if (profile.cerebralPalsySeverity >= Severity.MODERATE) {
    return InputMethod.BOTH;
  }

  return InputMethod.KEYBOARD;
}

