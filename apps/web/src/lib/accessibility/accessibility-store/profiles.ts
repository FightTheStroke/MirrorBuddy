// ============================================================================
// ACCESSIBILITY PROFILE PRESETS
// Pre-configured accessibility settings for different needs
// ============================================================================

import type { AccessibilitySettings } from './types';

/**
 * Apply dyslexia-optimized settings
 */
export function applyDyslexiaProfile(settings: AccessibilitySettings): AccessibilitySettings {
  return {
    ...settings,
    dyslexiaFont: true,
    extraLetterSpacing: true,
    increasedLineHeight: true,
    lineSpacing: 1.5,
    fontSize: 1.1,
    voicePreference: 'alloy',
  };
}

/**
 * Apply ADHD-optimized settings
 */
export function applyADHDProfile(settings: AccessibilitySettings): AccessibilitySettings {
  return {
    ...settings,
    adhdMode: true,
    distractionFreeMode: true,
    breakReminders: true,
    reducedMotion: true,
    voicePreference: 'echo',
  };
}

/**
 * Apply visual impairment optimized settings
 */
export function applyVisualImpairmentProfile(
  settings: AccessibilitySettings,
): AccessibilitySettings {
  return {
    ...settings,
    highContrast: true,
    largeText: true,
    fontSize: 1.3,
    ttsEnabled: true,
    voicePreference: 'nova',
  };
}

/**
 * Apply motor impairment optimized settings
 */
export function applyMotorImpairmentProfile(
  settings: AccessibilitySettings,
): AccessibilitySettings {
  return {
    ...settings,
    keyboardNavigation: true,
    reducedMotion: true,
    voicePreference: 'fable',
  };
}

/**
 * Apply autism-optimized settings
 */
export function applyAutismProfile(settings: AccessibilitySettings): AccessibilitySettings {
  return {
    ...settings,
    reducedMotion: true,
    distractionFreeMode: true,
    highContrast: false, // Avoid sensory overload from harsh contrast
    lineSpacing: 1.4,
    fontSize: 1.1,
    voicePreference: 'onyx',
  };
}

/**
 * Apply auditory impairment optimized settings
 */
export function applyAuditoryImpairmentProfile(
  settings: AccessibilitySettings,
): AccessibilitySettings {
  return {
    ...settings,
    ttsEnabled: false, // TTS not useful for hearing impairment
    largeText: true, // Emphasize visual communication
    lineSpacing: 1.3,
    voicePreference: 'shimmer',
    // Visual cues become primary - no audio-dependent features
  };
}

/**
 * Apply cerebral palsy optimized settings
 */
export function applyCerebralPalsyProfile(settings: AccessibilitySettings): AccessibilitySettings {
  return {
    ...settings,
    keyboardNavigation: true, // Essential for motor control challenges
    reducedMotion: true, // Reduce visual fatigue
    ttsEnabled: true, // Assist with reading if eye tracking is difficult
    largeText: true, // Easier visual targeting
    fontSize: 1.2,
    lineSpacing: 1.4,
    extraLetterSpacing: true, // Compensate for visual tracking difficulties
    voicePreference: 'ash',
  };
}
