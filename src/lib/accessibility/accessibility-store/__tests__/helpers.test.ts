/**
 * Tests for Accessibility Store Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  getLineSpacing,
  getFontSizeMultiplier,
  getLetterSpacing,
  shouldAnimate,
  getAnimationDuration,
} from '../helpers';
import type { AccessibilitySettings } from '../types';

describe('accessibility-store-helpers', () => {
  const defaultSettings: AccessibilitySettings = {
    fontSize: 1,
    lineSpacing: 1.2,
    dyslexiaFont: false,
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    increasedLineHeight: false,
    extraLetterSpacing: false,
    screenReaderOptimized: false,
    focusHighlight: false,
    simplifiedUI: false,
    textToSpeech: false,
    captions: false,
    colorBlindSupport: 'none',
  };

  describe('getLineSpacing', () => {
    it('returns base lineSpacing by default', () => {
      expect(getLineSpacing(defaultSettings)).toBe(1.2);
    });

    it('returns base lineSpacing when only dyslexiaFont is true', () => {
      const settings = { ...defaultSettings, dyslexiaFont: true };
      expect(getLineSpacing(settings)).toBe(1.2);
    });

    it('returns base lineSpacing when only increasedLineHeight is true', () => {
      const settings = { ...defaultSettings, increasedLineHeight: true };
      expect(getLineSpacing(settings)).toBe(1.2);
    });

    it('returns at least 1.5 when dyslexiaFont and increasedLineHeight are true', () => {
      const settings = { ...defaultSettings, dyslexiaFont: true, increasedLineHeight: true };
      expect(getLineSpacing(settings)).toBe(1.5);
    });

    it('keeps original spacing if already higher than 1.5', () => {
      const settings = { ...defaultSettings, dyslexiaFont: true, increasedLineHeight: true, lineSpacing: 2 };
      expect(getLineSpacing(settings)).toBe(2);
    });

    it('increases to 1.5 if spacing is lower', () => {
      const settings = { ...defaultSettings, dyslexiaFont: true, increasedLineHeight: true, lineSpacing: 1 };
      expect(getLineSpacing(settings)).toBe(1.5);
    });
  });

  describe('getFontSizeMultiplier', () => {
    it('returns base fontSize by default', () => {
      expect(getFontSizeMultiplier(defaultSettings)).toBe(1);
    });

    it('multiplies by 1.2 when largeText is true', () => {
      const settings = { ...defaultSettings, largeText: true };
      expect(getFontSizeMultiplier(settings)).toBe(1.2);
    });

    it('applies 1.2 multiplier on top of custom fontSize', () => {
      const settings = { ...defaultSettings, fontSize: 1.5, largeText: true };
      expect(getFontSizeMultiplier(settings)).toBeCloseTo(1.8);
    });

    it('returns custom fontSize without largeText', () => {
      const settings = { ...defaultSettings, fontSize: 1.5 };
      expect(getFontSizeMultiplier(settings)).toBe(1.5);
    });

    it('handles small base fontSize', () => {
      const settings = { ...defaultSettings, fontSize: 0.8, largeText: true };
      expect(getFontSizeMultiplier(settings)).toBeCloseTo(0.96);
    });
  });

  describe('getLetterSpacing', () => {
    it('returns 0 by default', () => {
      expect(getLetterSpacing(defaultSettings)).toBe(0);
    });

    it('returns 0 when only dyslexiaFont is true', () => {
      const settings = { ...defaultSettings, dyslexiaFont: true };
      expect(getLetterSpacing(settings)).toBe(0);
    });

    it('returns 0 when only extraLetterSpacing is true', () => {
      const settings = { ...defaultSettings, extraLetterSpacing: true };
      expect(getLetterSpacing(settings)).toBe(0);
    });

    it('returns 0.05 when both dyslexiaFont and extraLetterSpacing are true', () => {
      const settings = { ...defaultSettings, dyslexiaFont: true, extraLetterSpacing: true };
      expect(getLetterSpacing(settings)).toBe(0.05);
    });
  });

  describe('shouldAnimate', () => {
    it('returns true by default', () => {
      expect(shouldAnimate(defaultSettings)).toBe(true);
    });

    it('returns false when reducedMotion is true', () => {
      const settings = { ...defaultSettings, reducedMotion: true };
      expect(shouldAnimate(settings)).toBe(false);
    });
  });

  describe('getAnimationDuration', () => {
    it('returns default duration (0.3) by default', () => {
      expect(getAnimationDuration(defaultSettings)).toBe(0.3);
    });

    it('returns 0 when reducedMotion is true', () => {
      const settings = { ...defaultSettings, reducedMotion: true };
      expect(getAnimationDuration(settings)).toBe(0);
    });

    it('returns custom base duration when provided', () => {
      expect(getAnimationDuration(defaultSettings, 0.5)).toBe(0.5);
    });

    it('returns 0 for custom duration when reducedMotion is true', () => {
      const settings = { ...defaultSettings, reducedMotion: true };
      expect(getAnimationDuration(settings, 1.0)).toBe(0);
    });

    it('handles very short durations', () => {
      expect(getAnimationDuration(defaultSettings, 0.1)).toBe(0.1);
    });

    it('handles very long durations', () => {
      expect(getAnimationDuration(defaultSettings, 2.0)).toBe(2.0);
    });
  });
});
