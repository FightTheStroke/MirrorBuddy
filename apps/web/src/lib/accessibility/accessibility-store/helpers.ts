// ============================================================================
// ACCESSIBILITY STORE HELPERS
// Utility functions for computing accessibility values
// ============================================================================

import type { AccessibilitySettings } from './types';

/**
 * Get computed line spacing value based on settings
 */
export function getLineSpacing(settings: AccessibilitySettings): number {
  let spacing = settings.lineSpacing;
  if (settings.dyslexiaFont && settings.increasedLineHeight) {
    spacing = Math.max(spacing, 1.5);
  }
  return spacing;
}

/**
 * Get computed font size multiplier based on settings
 */
export function getFontSizeMultiplier(settings: AccessibilitySettings): number {
  let multiplier = settings.fontSize;
  if (settings.largeText) {
    multiplier *= 1.2;
  }
  return multiplier;
}

/**
 * Get computed letter spacing based on settings
 */
export function getLetterSpacing(settings: AccessibilitySettings): number {
  if (settings.dyslexiaFont && settings.extraLetterSpacing) {
    return 0.05;
  }
  return 0;
}

/**
 * Check if animations should be enabled
 */
export function shouldAnimate(settings: AccessibilitySettings): boolean {
  return !settings.reducedMotion;
}

/**
 * Get animation duration (0 if reduced motion is enabled)
 */
export function getAnimationDuration(settings: AccessibilitySettings, baseDuration = 0.3): number {
  return settings.reducedMotion ? 0 : baseDuration;
}
