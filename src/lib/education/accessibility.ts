/**
 * @file accessibility.ts
 * @brief Accessibility runtime adaptations for Convergio Education
 *
 * Implements accessibility adaptations for students with:
 * - Dyslexia (DY01-07)
 * - Dyscalculia (DC01-06)
 * - ADHD (AD01-06)
 * - Cerebral Palsy (CP01-05)
 * - Autism (AU01-06)
 *
 * Reference: /Users/roberdan/GitHub/ConvergioCLI/include/nous/education.h
 */

import { CSSProperties } from 'react';

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export enum Severity {
  NONE = 0,
  MILD = 1,
  MODERATE = 2,
  SEVERE = 3,
}

export enum ADHDType {
  NONE = 0,
  INATTENTIVE = 1,
  HYPERACTIVE = 2,
  COMBINED = 3,
}

export enum InputMethod {
  KEYBOARD = 0,
  VOICE = 1,
  BOTH = 2,
  TOUCH = 3,
  SWITCH = 4,
  EYE_TRACKING = 5,
}

export enum OutputMethod {
  TEXT = 0,
  TTS = 1,
  BOTH = 2,
  VISUAL = 3,
  AUDIO = 4,
  BRAILLE = 5,
  HAPTIC = 6,
}

export type FontSize = 'normal' | 'large' | 'x-large';

/**
 * Accessibility profile for a student
 * Maps to EducationAccessibility in C
 */
export interface AccessibilityProfile {
  // Conditions - severity levels and flags
  dyslexia: boolean;
  dyslexiaSeverity: Severity;
  dyscalculia: boolean;
  dyscalculiaSeverity: Severity;
  cerebralPalsy: boolean;
  cerebralPalsySeverity: Severity;
  adhd: boolean;
  adhdType: ADHDType;
  adhdSeverity: Severity;
  autism: boolean;
  autismSeverity: Severity;
  visualImpairment: boolean;
  hearingImpairment: boolean;

  // Preferences
  preferredInput: InputMethod;
  preferredOutput: OutputMethod;
  ttsEnabled: boolean;
  ttsSpeed: number; // 0.5 - 2.0
  ttsPitch: number; // -1.0 to 1.0 (0.0 = default)
  ttsVoice?: string;
  highContrast: boolean;
  reduceMotion: boolean;

  // Font and text settings
  fontSize: FontSize;
}

// ============================================================================
// DYSLEXIA SUPPORT (DY01-07)
// ============================================================================

/**
 * Get recommended font for dyslexia support
 * DY01: Use OpenDyslexic or similar dyslexia-friendly fonts
 */
export function a11yGetFont(profile: AccessibilityProfile): string {
  if (!profile.dyslexia) {
    return 'system-ui, -apple-system, sans-serif';
  }

  // OpenDyslexic is ideal, but fallback to readable alternatives
  return "'OpenDyslexic', 'Comic Sans MS', 'Arial', sans-serif";
}

/**
 * Get recommended line spacing for dyslexia
 * DY02: Increase line spacing for easier reading
 */
export function a11yGetLineSpacing(profile: AccessibilityProfile): number {
  if (!profile.dyslexia) {
    return 1.5;
  }

  switch (profile.dyslexiaSeverity) {
    case Severity.SEVERE:
      return 2.0;
    case Severity.MODERATE:
      return 1.8;
    case Severity.MILD:
      return 1.6;
    default:
      return 1.5;
  }
}

/**
 * Get maximum line width in characters
 * DY03: Limit line width to prevent overwhelm (50-70 chars optimal)
 */
export function a11yGetMaxLineWidth(profile: AccessibilityProfile): number {
  if (!profile.dyslexia) {
    return 80;
  }

  switch (profile.dyslexiaSeverity) {
    case Severity.SEVERE:
      return 50;
    case Severity.MODERATE:
      return 60;
    case Severity.MILD:
      return 70;
    default:
      return 80;
  }
}

/**
 * Wrap text to maximum line width
 * DY04: Break long lines into manageable chunks
 */
export function a11yWrapText(text: string, maxWidth: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Get background color for dyslexia-friendly reading
 * DY05: Use cream/beige instead of pure white (reduces glare)
 */
export function a11yGetBackgroundColor(profile: AccessibilityProfile): string {
  if (!profile.dyslexia) {
    return '#ffffff';
  }

  if (profile.highContrast) {
    return '#000000'; // Black background for high contrast
  }

  // Cream/beige reduces visual stress
  return '#faf8f3';
}

/**
 * Get text color for dyslexia-friendly reading
 */
export function a11yGetTextColor(profile: AccessibilityProfile): string {
  if (profile.highContrast) {
    return '#ffff00'; // Yellow on black for high contrast
  }

  if (profile.dyslexia) {
    return '#2b2b2b'; // Dark gray instead of pure black
  }

  return '#000000';
}

/**
 * Check if TTS highlight should be shown during reading
 * DY06: Highlight words as they're read aloud
 */
export function a11yWantsTtsHighlight(profile: AccessibilityProfile): boolean {
  return profile.dyslexia && profile.ttsEnabled;
}

/**
 * Syllabify a single Italian word for easier reading
 * DY07: Add soft hyphens to show syllable breaks
 *
 * Italian syllabification rules:
 * - CV (consonant + vowel): pa-ne, ca-sa
 * - V-CV: a-mi-co, u-ni-re
 * - VC-CV: par-te, al-to
 * - V-CCV: a-stra, i-scri-ve-re
 */
export function syllabifyWord(word: string): string {
  if (word.length <= 3) {
    return word; // Too short to syllabify
  }

  const vowels = 'aeiouàèéìòù';
  const isVowel = (c: string) => vowels.includes(c.toLowerCase());

  let result = '';
  let i = 0;

  while (i < word.length) {
    result += word[i];

    // Look ahead for syllable breaks
    if (i < word.length - 2) {
      const curr = word[i];
      const next = word[i + 1];
      const nextNext = word[i + 2];

      // V-CV pattern: insert hyphen between vowel and consonant
      if (isVowel(curr) && !isVowel(next) && isVowel(nextNext)) {
        result += '\u00AD'; // Soft hyphen
      }
      // VC-CV pattern: insert hyphen between consonants
      else if (!isVowel(curr) && !isVowel(next) && i > 0 && isVowel(word[i - 1])) {
        result += '\u00AD';
      }
    }

    i++;
  }

  return result;
}

/**
 * Syllabify entire text for dyslexia support
 */
export function syllabifyText(text: string): string {
  return text.split(/\s+/).map(word => {
    // Preserve punctuation
    const match = word.match(/^([^\w]*)(.+?)([^\w]*)$/);
    if (match) {
      const [, prefix, core, suffix] = match;
      return prefix + syllabifyWord(core) + suffix;
    }
    return syllabifyWord(word);
  }).join(' ');
}

/**
 * Format text with dyslexia-friendly styling
 */
export function formatForDyslexia(text: string): string {
  // Add soft hyphens for syllable breaks
  const syllabified = syllabifyText(text);

  // Increase word spacing (done via CSS)
  return syllabified;
}

// ============================================================================
// DYSCALCULIA SUPPORT (DC01-06)
// ============================================================================

/**
 * Format a number with color-coded digits for dyscalculia
 * DC01: Color code place values (units=blue, tens=green, hundreds=red)
 */
export function formatNumberColored(num: number, useColors: boolean = true): string {
  if (!useColors) {
    return num.toString();
  }

  const str = Math.abs(num).toString();
  const digits = str.split('').reverse();

  const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6']; // blue, green, red, orange, purple

  let html = '';
  for (let i = 0; i < digits.length; i++) {
    const color = colors[i % colors.length];
    html = `<span style="color: ${color}; font-weight: 600;">${digits[i]}</span>` + html;

    // Add comma separators for thousands
    if (i > 0 && i % 3 === 2 && i < digits.length - 1) {
      html = ',' + html;
    }
  }

  return (num < 0 ? '-' : '') + html;
}

/**
 * Generate visual place value blocks for a number
 * DC02: Show hundreds, tens, ones as visual blocks
 */
export function generatePlaceValueBlocks(num: number): string {
  const absNum = Math.abs(num);
  const hundreds = Math.floor(absNum / 100);
  const tens = Math.floor((absNum % 100) / 10);
  const ones = absNum % 10;

  let blocks = '';

  // Hundreds (large red blocks)
  if (hundreds > 0) {
    blocks += `<div class="place-value-group">`;
    blocks += `<span class="place-label">Centinaia</span>`;
    for (let i = 0; i < hundreds; i++) {
      blocks += `<div class="hundred-block" style="width: 40px; height: 40px; background: #ef4444; display: inline-block; margin: 2px;"></div>`;
    }
    blocks += `</div>`;
  }

  // Tens (medium green blocks)
  if (tens > 0) {
    blocks += `<div class="place-value-group">`;
    blocks += `<span class="place-label">Decine</span>`;
    for (let i = 0; i < tens; i++) {
      blocks += `<div class="ten-block" style="width: 30px; height: 30px; background: #10b981; display: inline-block; margin: 2px;"></div>`;
    }
    blocks += `</div>`;
  }

  // Ones (small blue blocks)
  if (ones > 0) {
    blocks += `<div class="place-value-group">`;
    blocks += `<span class="place-label">Unità</span>`;
    for (let i = 0; i < ones; i++) {
      blocks += `<div class="one-block" style="width: 20px; height: 20px; background: #3b82f6; display: inline-block; margin: 2px;"></div>`;
    }
    blocks += `</div>`;
  }

  return blocks;
}

/**
 * Check if math timer should be disabled
 * DC03: Remove time pressure for dyscalculia students
 */
export function shouldDisableMathTimer(profile: AccessibilityProfile): boolean {
  return profile.dyscalculia && profile.dyscalculiaSeverity >= Severity.MODERATE;
}

/**
 * Format a math step into atomic sub-steps
 * DC04: Break complex operations into simple steps
 */
export function formatMathStep(step: string): string[] {
  // Example: "2 + 3 × 4" becomes ["First: 3 × 4 = 12", "Then: 2 + 12 = 14"]

  // This is a simplified example - real implementation would need proper parsing
  const steps: string[] = [];

  // Check for order of operations
  if (step.includes('×') || step.includes('÷')) {
    // Handle multiplication/division first
    steps.push(`Primo passo: Risolvi le moltiplicazioni e divisioni`);
    steps.push(`Secondo passo: Risolvi le addizioni e sottrazioni`);
  } else {
    // Simple left-to-right
    steps.push(`Risolvi da sinistra a destra: ${step}`);
  }

  return steps;
}

/**
 * Get alternative math representation preference
 * DC05: Offer multiple representations (visual, verbal, symbolic)
 */
export function getAlternativeRepresentation(profile: AccessibilityProfile): 'visual' | 'verbal' | 'both' {
  if (profile.dyscalculia) {
    return 'both'; // Always show both for dyscalculia
  }
  return 'visual';
}

/**
 * Format a fraction with visual representation
 * DC06: Show fractions as visual pie charts or bars
 */
export function formatFractionVisual(numerator: number, denominator: number): string {
  const percentage = (numerator / denominator) * 100;

  let visual = '<div class="fraction-visual" style="display: inline-flex; flex-direction: column; align-items: center; margin: 0 8px;">';

  // Show as fraction
  visual += `<div class="fraction-notation" style="text-align: center; margin-bottom: 4px;">`;
  visual += `<div style="border-bottom: 2px solid #000; padding: 2px 8px;">${numerator}</div>`;
  visual += `<div style="padding: 2px 8px;">${denominator}</div>`;
  visual += `</div>`;

  // Show as bar
  visual += `<div class="fraction-bar" style="width: 100px; height: 20px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">`;
  visual += `<div style="width: ${percentage}%; height: 100%; background: #3b82f6;"></div>`;
  visual += `</div>`;

  visual += `<div class="fraction-percentage" style="margin-top: 4px; font-size: 12px; color: #6b7280;">${percentage.toFixed(0)}%</div>`;
  visual += '</div>';

  return visual;
}

// ============================================================================
// ADHD SUPPORT (AD01-06)
// ============================================================================

/**
 * Limit bullet points to reduce cognitive load
 * AD01: Max 3-5 bullets for ADHD students
 */
export function limitBulletPoints(text: string, maxBullets: number = 5): string {
  const lines = text.split('\n');
  const bulletLines: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    if (line.trim().match(/^[-*•]\s/)) {
      bulletLines.push(line);
    } else {
      otherLines.push(line);
    }
  }

  const limitedBullets = bulletLines.slice(0, maxBullets);

  if (bulletLines.length > maxBullets) {
    limitedBullets.push(`... e altri ${bulletLines.length - maxBullets} punti`);
  }

  return [...otherLines, ...limitedBullets].join('\n');
}

/**
 * Get recommended session duration for ADHD
 * AD02: Shorter sessions (15-20 min) for better focus
 */
export function getSessionDuration(profile: AccessibilityProfile): number {
  if (!profile.adhd) {
    return 30 * 60; // 30 minutes default
  }

  switch (profile.adhdSeverity) {
    case Severity.SEVERE:
      return 10 * 60; // 10 minutes
    case Severity.MODERATE:
      return 15 * 60; // 15 minutes
    case Severity.MILD:
      return 20 * 60; // 20 minutes
    default:
      return 30 * 60;
  }
}

/**
 * Check if break reminder should be shown
 * AD03: Regular break reminders for ADHD
 */
export function shouldShowBreakReminder(
  sessionStart: Date,
  profile: AccessibilityProfile
): boolean {
  if (!profile.adhd) {
    return false;
  }

  const sessionDuration = getSessionDuration(profile);
  const elapsed = (Date.now() - sessionStart.getTime()) / 1000;

  return elapsed >= sessionDuration;
}

/**
 * Get maximum bullet points based on ADHD severity
 * AD04: Fewer items for higher severity
 */
export function getMaxBullets(profile: AccessibilityProfile): number {
  if (!profile.adhd) {
    return 10;
  }

  switch (profile.adhdSeverity) {
    case Severity.SEVERE:
      return 3;
    case Severity.MODERATE:
      return 5;
    case Severity.MILD:
      return 7;
    default:
      return 10;
  }
}

/**
 * Generate progress bar for task completion
 * AD05: Visual progress indicators for motivation
 */
export function generateProgressBar(current: number, total: number, width: number = 20): string {
  const percentage = Math.min(100, (current / total) * 100);
  const filled = Math.round((width * percentage) / 100);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return `[${bar}] ${percentage.toFixed(0)}% (${current}/${total})`;
}

/**
 * Get celebration message based on achievement
 * AD06: Positive reinforcement for ADHD students
 */
export function getCelebrationMessage(achievementLevel: number): string {
  const messages = [
    'Ben fatto! Continua così!',
    'Fantastico! Stai facendo progressi!',
    'Eccellente lavoro! Sei in gamba!',
    'Straordinario! Sei un campione!',
    'Incredibile! Hai superato te stesso!',
  ];

  return messages[Math.min(achievementLevel, messages.length - 1)];
}

/**
 * Check if gamification should be enhanced
 */
export function shouldEnhanceGamification(profile: AccessibilityProfile): boolean {
  return profile.adhd && profile.adhdSeverity >= Severity.MODERATE;
}

// ============================================================================
// CEREBRAL PALSY SUPPORT (CP01-05)
// ============================================================================

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

// ============================================================================
// AUTISM SUPPORT (AU01-06)
// ============================================================================

/**
 * Check if metaphors should be avoided
 * AU01: Literal language for autism
 */
export function shouldAvoidMetaphors(profile: AccessibilityProfile): boolean {
  return profile.autism && profile.autismSeverity >= Severity.MODERATE;
}

/**
 * Detect if text contains common metaphors
 * AU02: Flag potentially confusing language
 */
export function containsMetaphors(text: string): boolean {
  const metaphorPatterns = [
    /raining cats and dogs/i,
    /piece of cake/i,
    /break the ice/i,
    /spill the beans/i,
    /cost an arm and a leg/i,
    // Italian metaphors
    /in bocca al lupo/i,
    /a occhi chiusi/i,
    /prendere due piccioni con una fava/i,
  ];

  return metaphorPatterns.some(pattern => pattern.test(text));
}

/**
 * Get structure prefix for section type
 * AU03: Clear section markers for predictability
 */
export function getStructurePrefix(sectionType: string): string {
  const prefixes: Record<string, string> = {
    introduction: '📖 Introduzione:',
    explanation: '💡 Spiegazione:',
    example: '✏️ Esempio:',
    exercise: '📝 Esercizio:',
    summary: '📋 Riepilogo:',
    question: '❓ Domanda:',
    answer: '✅ Risposta:',
  };

  return prefixes[sectionType] || `• ${sectionType}:`;
}

/**
 * Generate warning for topic change
 * AU04: Predictability and transition warnings
 */
export function getTopicChangeWarning(oldTopic: string, newTopic: string): string {
  return `⚠️ Cambio di argomento: Ora passiamo da "${oldTopic}" a "${newTopic}".`;
}

/**
 * Check if social pressure should be avoided
 * AU05: No competitive elements for autism
 */
export function shouldAvoidSocialPressure(profile: AccessibilityProfile): boolean {
  return profile.autism && profile.autismSeverity >= Severity.MODERATE;
}

/**
 * Check if motion should be reduced
 * AU06: Reduce animations for sensory sensitivity
 */
export function shouldReduceMotion(profile: AccessibilityProfile): boolean {
  return profile.autism || profile.reduceMotion;
}

// ============================================================================
// COMBINED ADAPTATIONS
// ============================================================================

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
interface PartialAccessibilitySettings {
  ttsEnabled?: boolean;
  ttsSpeed?: number;
  highContrast?: boolean;
  reducedMotion?: boolean;
  dyslexiaFont?: boolean;
}

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

// ============================================================================
// EXPORTS
// ============================================================================

const accessibilityUtils = {
  // Types
  Severity,
  ADHDType,
  InputMethod,
  OutputMethod,

  // Dyslexia
  a11yGetFont,
  a11yGetLineSpacing,
  a11yGetMaxLineWidth,
  a11yWrapText,
  a11yGetBackgroundColor,
  a11yGetTextColor,
  a11yWantsTtsHighlight,
  syllabifyWord,
  syllabifyText,
  formatForDyslexia,

  // Dyscalculia
  formatNumberColored,
  generatePlaceValueBlocks,
  shouldDisableMathTimer,
  formatMathStep,
  getAlternativeRepresentation,
  formatFractionVisual,

  // ADHD
  limitBulletPoints,
  getSessionDuration,
  shouldShowBreakReminder,
  getMaxBullets,
  generateProgressBar,
  getCelebrationMessage,
  shouldEnhanceGamification,

  // Cerebral Palsy
  getTimeoutMultiplier,
  getAdjustedTimeout,
  shouldUseVoiceInput,
  shouldSuggestBreak,
  getRecommendedInputMethod,

  // Autism
  shouldAvoidMetaphors,
  containsMetaphors,
  getStructurePrefix,
  getTopicChangeWarning,
  shouldAvoidSocialPressure,
  shouldReduceMotion,

  // Combined
  adaptContent,
  getAccessibilityCSS,
  getAdaptationsSummary,

  // Utilities
  createDefaultProfile,
  mergeWithAccessibilitySettings,
};

export default accessibilityUtils;
