/**
 * Motor Accessibility Tests
 * Tests for cerebral palsy support functions (CP01-05)
 */

import { describe, it, expect } from 'vitest';
import {
  getTimeoutMultiplier,
  getAdjustedTimeout,
  shouldUseVoiceInput,
  shouldSuggestBreak,
  getRecommendedInputMethod,
} from '../motor';
import { Severity, InputMethod, ADHDType, OutputMethod } from '../types';
import type { AccessibilityProfile } from '../types';

const createProfile = (overrides: Partial<AccessibilityProfile> = {}): AccessibilityProfile => ({
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
  ...overrides,
});

describe('motor accessibility', () => {
  describe('getTimeoutMultiplier', () => {
    it('should return 1.0 for non-CP profile', () => {
      const profile = createProfile();
      expect(getTimeoutMultiplier(profile)).toBe(1.0);
    });

    it('should return 3.0 for severe CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.SEVERE,
      });
      expect(getTimeoutMultiplier(profile)).toBe(3.0);
    });

    it('should return 2.5 for moderate CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MODERATE,
      });
      expect(getTimeoutMultiplier(profile)).toBe(2.5);
    });

    it('should return 2.0 for mild CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MILD,
      });
      expect(getTimeoutMultiplier(profile)).toBe(2.0);
    });

    it('should return 1.0 for CP with NONE severity', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.NONE,
      });
      expect(getTimeoutMultiplier(profile)).toBe(1.0);
    });
  });

  describe('getAdjustedTimeout', () => {
    it('should apply multiplier to base timeout', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.SEVERE,
      });
      expect(getAdjustedTimeout(profile, 1000)).toBe(3000);
    });

    it('should return base timeout for non-CP profile', () => {
      const profile = createProfile();
      expect(getAdjustedTimeout(profile, 1000)).toBe(1000);
    });

    it('should apply moderate multiplier', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MODERATE,
      });
      expect(getAdjustedTimeout(profile, 1000)).toBe(2500);
    });
  });

  describe('shouldUseVoiceInput', () => {
    it('should return false for non-CP profile', () => {
      const profile = createProfile();
      expect(shouldUseVoiceInput(profile)).toBe(false);
    });

    it('should return true for moderate CP severity', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MODERATE,
      });
      expect(shouldUseVoiceInput(profile)).toBe(true);
    });

    it('should return true for severe CP severity', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.SEVERE,
      });
      expect(shouldUseVoiceInput(profile)).toBe(true);
    });

    it('should return false for mild CP severity without voice preference', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MILD,
      });
      expect(shouldUseVoiceInput(profile)).toBe(false);
    });

    it('should return true when preferred input is VOICE', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MILD,
        preferredInput: InputMethod.VOICE,
      });
      expect(shouldUseVoiceInput(profile)).toBe(true);
    });

    it('should return true when preferred input is BOTH', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MILD,
        preferredInput: InputMethod.BOTH,
      });
      expect(shouldUseVoiceInput(profile)).toBe(true);
    });
  });

  describe('shouldSuggestBreak', () => {
    it('should suggest break after 30 minutes for non-CP profile', () => {
      const profile = createProfile();
      expect(shouldSuggestBreak(profile, 29)).toBe(false);
      expect(shouldSuggestBreak(profile, 30)).toBe(true);
    });

    it('should suggest break after 10 minutes for severe CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.SEVERE,
      });
      expect(shouldSuggestBreak(profile, 9)).toBe(false);
      expect(shouldSuggestBreak(profile, 10)).toBe(true);
    });

    it('should suggest break after 15 minutes for moderate CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MODERATE,
      });
      expect(shouldSuggestBreak(profile, 14)).toBe(false);
      expect(shouldSuggestBreak(profile, 15)).toBe(true);
    });

    it('should suggest break after 20 minutes for mild CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MILD,
      });
      expect(shouldSuggestBreak(profile, 19)).toBe(false);
      expect(shouldSuggestBreak(profile, 20)).toBe(true);
    });

    it('should suggest break after 30 minutes for CP with NONE severity', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.NONE,
      });
      expect(shouldSuggestBreak(profile, 29)).toBe(false);
      expect(shouldSuggestBreak(profile, 30)).toBe(true);
    });
  });

  describe('getRecommendedInputMethod', () => {
    it('should return KEYBOARD for non-CP profile', () => {
      const profile = createProfile();
      expect(getRecommendedInputMethod(profile)).toBe(InputMethod.KEYBOARD);
    });

    it('should return VOICE for severe CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.SEVERE,
      });
      expect(getRecommendedInputMethod(profile)).toBe(InputMethod.VOICE);
    });

    it('should return BOTH for moderate CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MODERATE,
      });
      expect(getRecommendedInputMethod(profile)).toBe(InputMethod.BOTH);
    });

    it('should return KEYBOARD for mild CP', () => {
      const profile = createProfile({
        cerebralPalsy: true,
        cerebralPalsySeverity: Severity.MILD,
      });
      expect(getRecommendedInputMethod(profile)).toBe(InputMethod.KEYBOARD);
    });
  });
});
