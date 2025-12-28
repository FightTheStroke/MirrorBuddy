/**
 * @file useEducationAccessibility.ts
 * @brief React hook for education accessibility adaptations
 *
 * Integrates the accessibility runtime functions with the existing
 * AccessibilityProvider from @/components/accessibility
 */

'use client';

import { useMemo } from 'react';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import {
  AccessibilityProfile,
  Severity,
  ADHDType,
  InputMethod,
  OutputMethod,
  createDefaultProfile,
  adaptContent,
  getAccessibilityCSS,
  a11yGetFont,
  a11yGetLineSpacing,
  a11yGetBackgroundColor,
  a11yGetTextColor,
  formatNumberColored,
  shouldDisableMathTimer,
  getSessionDuration,
  shouldShowBreakReminder,
  getMaxBullets,
  limitBulletPoints,
  getTimeoutMultiplier,
  getAdjustedTimeout,
  shouldUseVoiceInput,
  syllabifyText,
  formatForDyslexia,
  generateProgressBar,
  getCelebrationMessage,
  shouldAvoidMetaphors,
  getStructurePrefix,
  shouldReduceMotion,
  getAdaptationsSummary,
} from './accessibility';

/**
 * Hook to get education accessibility profile from store
 */
export function useEducationAccessibility() {
  const { settings } = useAccessibilityStore();

  // Convert store settings to AccessibilityProfile
  const profile = useMemo<AccessibilityProfile>(() => {
    const baseProfile = createDefaultProfile();

    return {
      ...baseProfile,

      // Map store settings to profile
      dyslexia: settings.dyslexiaFont,
      dyslexiaSeverity: settings.dyslexiaFont
        ? settings.increasedLineHeight
          ? Severity.MODERATE
          : Severity.MILD
        : Severity.NONE,

      adhd: settings.adhdMode,
      adhdType: settings.adhdMode ? ADHDType.COMBINED : ADHDType.NONE,
      adhdSeverity: settings.adhdMode
        ? settings.distractionFreeMode
          ? Severity.MODERATE
          : Severity.MILD
        : Severity.NONE,

      ttsEnabled: settings.ttsEnabled,
      ttsSpeed: settings.ttsSpeed,
      ttsPitch: 0.0,

      highContrast: settings.highContrast,
      reduceMotion: settings.reducedMotion,

      fontSize: settings.largeText ? 'large' : 'normal',

      preferredInput: InputMethod.KEYBOARD,
      preferredOutput: settings.ttsEnabled ? OutputMethod.BOTH : OutputMethod.TEXT,

      // Defaults for conditions not in store
      dyscalculia: false,
      dyscalculiaSeverity: Severity.NONE,
      cerebralPalsy: false,
      cerebralPalsySeverity: Severity.NONE,
      autism: false,
      autismSeverity: Severity.NONE,
      visualImpairment: settings.highContrast || settings.largeText,
      hearingImpairment: false,
    };
  }, [settings]);

  // Adaptation functions bound to current profile
  const adaptations = useMemo(
    () => ({
      // Content adaptation
      adaptContent: (content: string) => adaptContent(content, profile),
      syllabifyText,
      formatForDyslexia,
      limitBulletPoints: (text: string) => limitBulletPoints(text, getMaxBullets(profile)),

      // Styling
      getCSS: () => getAccessibilityCSS(profile),
      getFont: () => a11yGetFont(profile),
      getLineSpacing: () => a11yGetLineSpacing(profile),
      getBackgroundColor: () => a11yGetBackgroundColor(profile),
      getTextColor: () => a11yGetTextColor(profile),

      // Math support
      formatNumber: (num: number, useColors = true) => formatNumberColored(num, useColors),
      shouldDisableMathTimer: () => shouldDisableMathTimer(profile),

      // ADHD support
      getSessionDuration: () => getSessionDuration(profile),
      shouldShowBreakReminder: (sessionStart: Date) =>
        shouldShowBreakReminder(sessionStart, profile),
      getMaxBullets: () => getMaxBullets(profile),
      generateProgressBar,
      getCelebrationMessage,

      // Motor impairment support
      getTimeoutMultiplier: () => getTimeoutMultiplier(profile),
      getAdjustedTimeout: (baseTimeout: number) => getAdjustedTimeout(profile, baseTimeout),
      shouldUseVoiceInput: () => shouldUseVoiceInput(profile),

      // Autism support
      shouldAvoidMetaphors: () => shouldAvoidMetaphors(profile),
      getStructurePrefix,
      shouldReduceMotion: () => shouldReduceMotion(profile),

      // Summary
      getAdaptationsSummary: () => getAdaptationsSummary(profile),
    }),
    [profile]
  );

  return {
    profile,
    ...adaptations,
  };
}

/**
 * Hook for ADHD-specific session management
 */
export function useADHDSession() {
  const { getSessionDuration, shouldShowBreakReminder } = useEducationAccessibility();
  const { adhdSessionState, adhdTimeRemaining, startADHDSession, stopADHDSession } =
    useAccessibilityStore();

  return {
    isActive: adhdSessionState === 'working',
    timeRemaining: adhdTimeRemaining,
    sessionDuration: getSessionDuration(),
    start: startADHDSession,
    stop: stopADHDSession,
    shouldShowBreak: (sessionStart: Date) => shouldShowBreakReminder(sessionStart),
  };
}

/**
 * Hook for dyslexia text formatting
 */
export function useDyslexiaFormatting() {
  const { profile, syllabifyText, formatForDyslexia } = useEducationAccessibility();

  return {
    enabled: profile.dyslexia,
    severity: profile.dyslexiaSeverity,
    syllabifyText,
    formatForDyslexia,
    shouldSyllabify: profile.dyslexia && profile.dyslexiaSeverity >= Severity.MODERATE,
  };
}

/**
 * Hook for math content with dyscalculia support
 */
export function useMathAccessibility() {
  const { profile, formatNumber, shouldDisableMathTimer } = useEducationAccessibility();

  return {
    enabled: profile.dyscalculia,
    severity: profile.dyscalculiaSeverity,
    formatNumber,
    shouldDisableTimer: shouldDisableMathTimer(),
    useColorCoding: profile.dyscalculia,
  };
}

/**
 * Hook for motor impairment adaptations
 */
export function useMotorAccessibility() {
  const { profile, getTimeoutMultiplier, getAdjustedTimeout, shouldUseVoiceInput } =
    useEducationAccessibility();

  return {
    enabled: profile.cerebralPalsy,
    severity: profile.cerebralPalsySeverity,
    timeoutMultiplier: getTimeoutMultiplier(),
    getAdjustedTimeout,
    shouldUseVoice: shouldUseVoiceInput(),
  };
}

export default useEducationAccessibility;
