/**
 * @file core.ts
 * @brief Core accessibility functions and CSS generation
 */

import { CSSProperties } from 'react';
import type { AccessibilityProfile, PartialAccessibilitySettings } from './types';
import { Severity, InputMethod, OutputMethod, ADHDType } from './types';
import { a11yGetFont, a11yGetLineSpacing, a11yGetMaxLineWidth, a11yWrapText, syllabifyText, a11yGetBackgroundColor, a11yGetTextColor } from './dyslexia';
import { getMaxBullets, limitBulletPoints, getSessionDuration } from './adhd';
import { shouldReduceMotion } from './autism';
import { getTimeoutMultiplier } from './motor';

/**
 * Apply all relevant text adaptations
 */
export function adaptContent(content: string, profile: AccessibilityProfile): string {
  let adapted = content;

  // Dyslexia: syllabification
  if (profile.dyslexia && profile.dyslexiaSeverity >= Severity.MODERATE) {
    adapted = syllabifyText(adapted);
  }

  // ADHD: limit bullets
  if (profile.adhd) {
    const maxBullets = getMaxBullets(profile);
    adapted = limitBulletPoints(adapted, maxBullets);
  }

  // Line wrapping for dyslexia
  if (profile.dyslexia) {
    const maxWidth = a11yGetMaxLineWidth(profile);
    adapted = a11yWrapText(adapted, maxWidth);
  }

  return adapted;
}

/**
 * Generate CSS properties for accessibility profile
 */
export function getAccessibilityCSS(profile: AccessibilityProfile): CSSProperties {
  const styles: CSSProperties = {
    fontFamily: a11yGetFont(profile),
    lineHeight: a11yGetLineSpacing(profile),
    backgroundColor: a11yGetBackgroundColor(profile),
    color: a11yGetTextColor(profile),
  };

  // Font size
  switch (profile.fontSize) {
    case 'large':
      styles.fontSize = '1.2rem';
      break;
    case 'x-large':
      styles.fontSize = '1.5rem';
      break;
    default:
      styles.fontSize = '1rem';
  }

  // Letter spacing for dyslexia
  if (profile.dyslexia) {
    styles.letterSpacing = '0.05em';
    styles.wordSpacing = '0.16em';
  }

  // Animation duration
  if (shouldReduceMotion(profile)) {
    styles.animationDuration = '0s';
    styles.transitionDuration = '0s';
  }

  return styles;
}

/**
 * Get complete accessibility adaptations summary
 */
export function getAdaptationsSummary(profile: AccessibilityProfile): string[] {
  const adaptations: string[] = [];

  if (profile.dyslexia) {
    adaptations.push(`Dislessia (${Severity[profile.dyslexiaSeverity]}): Font speciale, spaziatura aumentata, sillabazione`);
  }

  if (profile.dyscalculia) {
    adaptations.push(`Discalculia (${Severity[profile.dyscalculiaSeverity]}): Numeri colorati, rappresentazioni visive, timer disabilitato`);
  }

  if (profile.adhd) {
    adaptations.push(`ADHD (${Severity[profile.adhdSeverity]}): Sessioni brevi (${getSessionDuration(profile) / 60} min), punti elenco limitati, pause frequenti`);
  }

  if (profile.cerebralPalsy) {
    adaptations.push(`Paralisi cerebrale (${Severity[profile.cerebralPalsySeverity]}): Timeout esteso (${getTimeoutMultiplier(profile)}x), input vocale suggerito`);
  }

  if (profile.autism) {
    adaptations.push(`Autismo (${Severity[profile.autismSeverity]}): Linguaggio letterale, struttura chiara, transizioni segnalate`);
  }

  if (profile.ttsEnabled) {
    adaptations.push(`Text-to-Speech abilitato (velocità: ${profile.ttsSpeed}x)`);
  }

  return adaptations;
}

/**
 * Create default accessibility profile
 */
export function createDefaultProfile(): AccessibilityProfile {
  return {
    dyslexia: false,
    dyslexiaSeverity: Severity.NONE,
    dyscalculia: false,
    dyscalculiaSeverity: Severity.NONE,
    cerebralPalsy: false,
    cerebralPalsySeverity: Severity.NONE,
    adhd: false,
    adhdType: ADHDType.NONE,
    adhdSeverity: Severity.NONE,
    autism: false,
    autismSeverity: Severity.NONE,
    visualImpairment: false,
    hearingImpairment: false,
    preferredInput: InputMethod.KEYBOARD,
    preferredOutput: OutputMethod.TEXT,
    ttsEnabled: false,
    ttsSpeed: 1.0,
    ttsPitch: 0.0,
    highContrast: false,
    reduceMotion: false,
    fontSize: 'normal',
  };
}

/**
 * Merge accessibility profile with settings from store
 */
export function mergeWithAccessibilitySettings(
  profile: AccessibilityProfile,
  settings: PartialAccessibilitySettings
): AccessibilityProfile {
  return {
    ...profile,
    ttsEnabled: settings.ttsEnabled ?? profile.ttsEnabled,
    ttsSpeed: settings.ttsSpeed ?? profile.ttsSpeed,
    highContrast: settings.highContrast ?? profile.highContrast,
    reduceMotion: settings.reducedMotion ?? profile.reduceMotion,
    dyslexia: settings.dyslexiaFont ?? profile.dyslexia,
  };
}

