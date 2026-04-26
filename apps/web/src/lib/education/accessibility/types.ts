/**
 * @file types.ts
 * @brief Types and enums for accessibility
 */

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

export interface PartialAccessibilitySettings {
  ttsEnabled?: boolean;
  ttsSpeed?: number;
  highContrast?: boolean;
  reducedMotion?: boolean;
  dyslexiaFont?: boolean;
}

