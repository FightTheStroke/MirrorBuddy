/**
 * Tests for accessibility.ts
 * Issue #69: Increase unit test coverage
 *
 * @vitest-environment node
 * @module education/__tests__/accessibility.test
 */

import { describe, it, expect } from 'vitest';
import {
  // Enums
  Severity,
  ADHDType,
  InputMethod,
  OutputMethod,
  // Types
  type AccessibilityProfile,
  // Dyslexia functions
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
  // Dyscalculia functions
  formatNumberColored,
  generatePlaceValueBlocks,
  shouldDisableMathTimer,
  formatMathStep,
  getAlternativeRepresentation,
  formatFractionVisual,
  // ADHD functions
  limitBulletPoints,
  getSessionDuration,
  shouldShowBreakReminder,
  getMaxBullets,
  generateProgressBar,
  getCelebrationMessage,
  shouldEnhanceGamification,
  // Cerebral Palsy functions
  getTimeoutMultiplier,
  getAdjustedTimeout,
  shouldUseVoiceInput,
  shouldSuggestBreak,
  getRecommendedInputMethod,
  // Autism functions
  shouldAvoidMetaphors,
  containsMetaphors,
  getStructurePrefix,
  getTopicChangeWarning,
  shouldAvoidSocialPressure,
  shouldReduceMotion,
  // Combined functions
  adaptContent,
  getAccessibilityCSS,
  getAdaptationsSummary,
  // Utility functions
  createDefaultProfile,
  mergeWithAccessibilitySettings,
} from '../accessibility';

// Helper to create a default test profile
function createTestProfile(overrides: Partial<AccessibilityProfile> = {}): AccessibilityProfile {
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
    ...overrides,
  };
}

describe('accessibility', () => {
  // ============================================================================
  // DYSLEXIA SUPPORT (DY01-07)
  // ============================================================================
  describe('Dyslexia Support', () => {
    describe('a11yGetFont', () => {
      it('should return system font for non-dyslexic profile', () => {
        const profile = createTestProfile({ dyslexia: false });
        expect(a11yGetFont(profile)).toBe('system-ui, -apple-system, sans-serif');
      });

      it('should return OpenDyslexic for dyslexic profile', () => {
        const profile = createTestProfile({ dyslexia: true });
        expect(a11yGetFont(profile)).toContain('OpenDyslexic');
      });
    });

    describe('a11yGetLineSpacing', () => {
      it('should return 1.5 for non-dyslexic profile', () => {
        const profile = createTestProfile({ dyslexia: false });
        expect(a11yGetLineSpacing(profile)).toBe(1.5);
      });

      it('should return 1.6 for mild dyslexia', () => {
        const profile = createTestProfile({ dyslexia: true, dyslexiaSeverity: Severity.MILD });
        expect(a11yGetLineSpacing(profile)).toBe(1.6);
      });

      it('should return 1.8 for moderate dyslexia', () => {
        const profile = createTestProfile({ dyslexia: true, dyslexiaSeverity: Severity.MODERATE });
        expect(a11yGetLineSpacing(profile)).toBe(1.8);
      });

      it('should return 2.0 for severe dyslexia', () => {
        const profile = createTestProfile({ dyslexia: true, dyslexiaSeverity: Severity.SEVERE });
        expect(a11yGetLineSpacing(profile)).toBe(2.0);
      });
    });

    describe('a11yGetMaxLineWidth', () => {
      it('should return 80 for non-dyslexic profile', () => {
        const profile = createTestProfile({ dyslexia: false });
        expect(a11yGetMaxLineWidth(profile)).toBe(80);
      });

      it('should return 70 for mild dyslexia', () => {
        const profile = createTestProfile({ dyslexia: true, dyslexiaSeverity: Severity.MILD });
        expect(a11yGetMaxLineWidth(profile)).toBe(70);
      });

      it('should return 60 for moderate dyslexia', () => {
        const profile = createTestProfile({ dyslexia: true, dyslexiaSeverity: Severity.MODERATE });
        expect(a11yGetMaxLineWidth(profile)).toBe(60);
      });

      it('should return 50 for severe dyslexia', () => {
        const profile = createTestProfile({ dyslexia: true, dyslexiaSeverity: Severity.SEVERE });
        expect(a11yGetMaxLineWidth(profile)).toBe(50);
      });
    });

    describe('a11yWrapText', () => {
      it('should wrap text at specified width', () => {
        const text = 'This is a long sentence that needs to be wrapped properly';
        const result = a11yWrapText(text, 20);
        const lines = result.split('\n');
        expect(lines.length).toBeGreaterThan(1);
        lines.forEach(line => {
          expect(line.length).toBeLessThanOrEqual(20);
        });
      });

      it('should handle empty text', () => {
        expect(a11yWrapText('', 50)).toBe('');
      });

      it('should handle single word longer than maxWidth', () => {
        const result = a11yWrapText('supercalifragilisticexpialidocious', 10);
        expect(result).toBe('supercalifragilisticexpialidocious');
      });
    });

    describe('a11yGetBackgroundColor', () => {
      it('should return white for non-dyslexic profile', () => {
        const profile = createTestProfile({ dyslexia: false });
        expect(a11yGetBackgroundColor(profile)).toBe('#ffffff');
      });

      it('should return cream for dyslexic profile', () => {
        const profile = createTestProfile({ dyslexia: true });
        expect(a11yGetBackgroundColor(profile)).toBe('#faf8f3');
      });

      it('should return black for high contrast', () => {
        const profile = createTestProfile({ dyslexia: true, highContrast: true });
        expect(a11yGetBackgroundColor(profile)).toBe('#000000');
      });
    });

    describe('a11yGetTextColor', () => {
      it('should return black for normal profile', () => {
        const profile = createTestProfile();
        expect(a11yGetTextColor(profile)).toBe('#000000');
      });

      it('should return dark gray for dyslexic profile', () => {
        const profile = createTestProfile({ dyslexia: true });
        expect(a11yGetTextColor(profile)).toBe('#2b2b2b');
      });

      it('should return yellow for high contrast', () => {
        const profile = createTestProfile({ highContrast: true });
        expect(a11yGetTextColor(profile)).toBe('#ffff00');
      });
    });

    describe('a11yWantsTtsHighlight', () => {
      it('should return false for non-dyslexic profile', () => {
        const profile = createTestProfile({ dyslexia: false, ttsEnabled: true });
        expect(a11yWantsTtsHighlight(profile)).toBe(false);
      });

      it('should return false when TTS is disabled', () => {
        const profile = createTestProfile({ dyslexia: true, ttsEnabled: false });
        expect(a11yWantsTtsHighlight(profile)).toBe(false);
      });

      it('should return true for dyslexic with TTS enabled', () => {
        const profile = createTestProfile({ dyslexia: true, ttsEnabled: true });
        expect(a11yWantsTtsHighlight(profile)).toBe(true);
      });
    });

    describe('syllabifyWord', () => {
      it('should not syllabify short words', () => {
        expect(syllabifyWord('il')).toBe('il');
        expect(syllabifyWord('la')).toBe('la');
        expect(syllabifyWord('uno')).toBe('uno');
      });

      it('should syllabify Italian words', () => {
        const result = syllabifyWord('casa');
        expect(result).toContain('\u00AD'); // Contains soft hyphen
      });

      it('should handle words with accented vowels', () => {
        const result = syllabifyWord('città');
        expect(result.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('syllabifyText', () => {
      it('should syllabify multiple words', () => {
        const result = syllabifyText('casa pane vino');
        expect(result).toContain(' '); // Preserves spaces
      });

      it('should preserve punctuation', () => {
        const result = syllabifyText('Ciao, mondo!');
        expect(result).toContain(',');
        expect(result).toContain('!');
      });
    });

    describe('formatForDyslexia', () => {
      it('should syllabify text', () => {
        const result = formatForDyslexia('casa bella');
        expect(result.length).toBeGreaterThanOrEqual('casa bella'.length);
      });
    });
  });

  // ============================================================================
  // DYSCALCULIA SUPPORT (DC01-06)
  // ============================================================================
  describe('Dyscalculia Support', () => {
    describe('formatNumberColored', () => {
      it('should return plain number when colors disabled', () => {
        expect(formatNumberColored(123, false)).toBe('123');
      });

      it('should return colored HTML when colors enabled', () => {
        const result = formatNumberColored(123, true);
        expect(result).toContain('<span');
        expect(result).toContain('style="color:');
      });

      it('should handle negative numbers', () => {
        const result = formatNumberColored(-42, true);
        expect(result).toContain('-');
      });

      it('should add comma separators for thousands', () => {
        const result = formatNumberColored(1234, true);
        expect(result).toContain(',');
      });
    });

    describe('generatePlaceValueBlocks', () => {
      it('should generate blocks for all place values', () => {
        const result = generatePlaceValueBlocks(123);
        expect(result).toContain('Centinaia');
        expect(result).toContain('Decine');
        expect(result).toContain('Unità');
      });

      it('should handle numbers with zeros', () => {
        const result = generatePlaceValueBlocks(100);
        expect(result).toContain('Centinaia');
        expect(result).not.toContain('Unità');
      });

      it('should handle small numbers', () => {
        const result = generatePlaceValueBlocks(5);
        expect(result).toContain('Unità');
        expect(result).not.toContain('Decine');
      });
    });

    describe('shouldDisableMathTimer', () => {
      it('should return false for non-dyscalculic profile', () => {
        const profile = createTestProfile({ dyscalculia: false });
        expect(shouldDisableMathTimer(profile)).toBe(false);
      });

      it('should return false for mild dyscalculia', () => {
        const profile = createTestProfile({ dyscalculia: true, dyscalculiaSeverity: Severity.MILD });
        expect(shouldDisableMathTimer(profile)).toBe(false);
      });

      it('should return true for moderate dyscalculia', () => {
        const profile = createTestProfile({ dyscalculia: true, dyscalculiaSeverity: Severity.MODERATE });
        expect(shouldDisableMathTimer(profile)).toBe(true);
      });

      it('should return true for severe dyscalculia', () => {
        const profile = createTestProfile({ dyscalculia: true, dyscalculiaSeverity: Severity.SEVERE });
        expect(shouldDisableMathTimer(profile)).toBe(true);
      });
    });

    describe('formatMathStep', () => {
      it('should break down complex operations', () => {
        const result = formatMathStep('2 + 3 × 4');
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toContain('moltiplicazioni');
      });

      it('should handle simple operations', () => {
        const result = formatMathStep('2 + 3');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('getAlternativeRepresentation', () => {
      it('should return visual for non-dyscalculic', () => {
        const profile = createTestProfile({ dyscalculia: false });
        expect(getAlternativeRepresentation(profile)).toBe('visual');
      });

      it('should return both for dyscalculic', () => {
        const profile = createTestProfile({ dyscalculia: true });
        expect(getAlternativeRepresentation(profile)).toBe('both');
      });
    });

    describe('formatFractionVisual', () => {
      it('should generate HTML with fraction and bar', () => {
        const result = formatFractionVisual(1, 2);
        expect(result).toContain('fraction-visual');
        expect(result).toContain('fraction-bar');
        expect(result).toContain('50%');
      });

      it('should calculate correct percentage', () => {
        const result = formatFractionVisual(3, 4);
        expect(result).toContain('75%');
      });
    });
  });

  // ============================================================================
  // ADHD SUPPORT (AD01-06)
  // ============================================================================
  describe('ADHD Support', () => {
    describe('limitBulletPoints', () => {
      it('should not limit when under max', () => {
        const text = '- Item 1\n- Item 2\n- Item 3';
        const result = limitBulletPoints(text, 5);
        expect(result).toContain('Item 1');
        expect(result).toContain('Item 3');
        expect(result).not.toContain('altri');
      });

      it('should limit when over max', () => {
        const text = '- Item 1\n- Item 2\n- Item 3\n- Item 4\n- Item 5\n- Item 6';
        const result = limitBulletPoints(text, 3);
        expect(result).toContain('Item 1');
        expect(result).toContain('altri 3 punti');
      });

      it('should handle different bullet styles', () => {
        const text = '* Item 1\n• Item 2\n- Item 3';
        const result = limitBulletPoints(text, 2);
        expect(result).toContain('altri');
      });
    });

    describe('getSessionDuration', () => {
      it('should return 30 min for non-ADHD', () => {
        const profile = createTestProfile({ adhd: false });
        expect(getSessionDuration(profile)).toBe(30 * 60);
      });

      it('should return 20 min for mild ADHD', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MILD });
        expect(getSessionDuration(profile)).toBe(20 * 60);
      });

      it('should return 15 min for moderate ADHD', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MODERATE });
        expect(getSessionDuration(profile)).toBe(15 * 60);
      });

      it('should return 10 min for severe ADHD', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.SEVERE });
        expect(getSessionDuration(profile)).toBe(10 * 60);
      });
    });

    describe('shouldShowBreakReminder', () => {
      it('should return false for non-ADHD', () => {
        const profile = createTestProfile({ adhd: false });
        const start = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        expect(shouldShowBreakReminder(start, profile)).toBe(false);
      });

      it('should return true when session duration exceeded', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MODERATE });
        const start = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
        expect(shouldShowBreakReminder(start, profile)).toBe(true);
      });

      it('should return false when session is still within time', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MODERATE });
        const start = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
        expect(shouldShowBreakReminder(start, profile)).toBe(false);
      });
    });

    describe('getMaxBullets', () => {
      it('should return 10 for non-ADHD', () => {
        const profile = createTestProfile({ adhd: false });
        expect(getMaxBullets(profile)).toBe(10);
      });

      it('should return 7 for mild ADHD', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MILD });
        expect(getMaxBullets(profile)).toBe(7);
      });

      it('should return 5 for moderate ADHD', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MODERATE });
        expect(getMaxBullets(profile)).toBe(5);
      });

      it('should return 3 for severe ADHD', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.SEVERE });
        expect(getMaxBullets(profile)).toBe(3);
      });
    });

    describe('generateProgressBar', () => {
      it('should generate correct progress bar', () => {
        const result = generateProgressBar(5, 10, 10);
        expect(result).toContain('50%');
        expect(result).toContain('5/10');
        expect(result).toContain('█');
        expect(result).toContain('░');
      });

      it('should handle 0%', () => {
        const result = generateProgressBar(0, 10, 10);
        expect(result).toContain('0%');
      });

      it('should cap at 100%', () => {
        const result = generateProgressBar(15, 10, 10);
        expect(result).toContain('100%');
      });
    });

    describe('getCelebrationMessage', () => {
      it('should return appropriate message for level 0', () => {
        const message = getCelebrationMessage(0);
        expect(message).toContain('Ben fatto');
      });

      it('should return appropriate message for level 4', () => {
        const message = getCelebrationMessage(4);
        expect(message).toContain('Incredibile');
      });

      it('should cap at maximum level', () => {
        const message = getCelebrationMessage(100);
        expect(message).toContain('Incredibile');
      });
    });

    describe('shouldEnhanceGamification', () => {
      it('should return false for non-ADHD', () => {
        const profile = createTestProfile({ adhd: false });
        expect(shouldEnhanceGamification(profile)).toBe(false);
      });

      it('should return false for mild ADHD', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MILD });
        expect(shouldEnhanceGamification(profile)).toBe(false);
      });

      it('should return true for moderate ADHD', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MODERATE });
        expect(shouldEnhanceGamification(profile)).toBe(true);
      });
    });
  });

  // ============================================================================
  // CEREBRAL PALSY SUPPORT (CP01-05)
  // ============================================================================
  describe('Cerebral Palsy Support', () => {
    describe('getTimeoutMultiplier', () => {
      it('should return 1.0 for non-CP', () => {
        const profile = createTestProfile({ cerebralPalsy: false });
        expect(getTimeoutMultiplier(profile)).toBe(1.0);
      });

      it('should return 2.0 for mild CP', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.MILD });
        expect(getTimeoutMultiplier(profile)).toBe(2.0);
      });

      it('should return 2.5 for moderate CP', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.MODERATE });
        expect(getTimeoutMultiplier(profile)).toBe(2.5);
      });

      it('should return 3.0 for severe CP', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.SEVERE });
        expect(getTimeoutMultiplier(profile)).toBe(3.0);
      });
    });

    describe('getAdjustedTimeout', () => {
      it('should multiply base timeout by multiplier', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.MODERATE });
        expect(getAdjustedTimeout(profile, 1000)).toBe(2500);
      });
    });

    describe('shouldUseVoiceInput', () => {
      it('should return false for non-CP', () => {
        const profile = createTestProfile({ cerebralPalsy: false });
        expect(shouldUseVoiceInput(profile)).toBe(false);
      });

      it('should return true for moderate CP', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.MODERATE });
        expect(shouldUseVoiceInput(profile)).toBe(true);
      });

      it('should return true when voice is preferred', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.MILD, preferredInput: InputMethod.VOICE });
        expect(shouldUseVoiceInput(profile)).toBe(true);
      });
    });

    describe('shouldSuggestBreak', () => {
      it('should suggest break after 30 min for non-CP', () => {
        const profile = createTestProfile({ cerebralPalsy: false });
        expect(shouldSuggestBreak(profile, 30)).toBe(true);
        expect(shouldSuggestBreak(profile, 25)).toBe(false);
      });

      it('should suggest break after 10 min for severe CP', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.SEVERE });
        expect(shouldSuggestBreak(profile, 10)).toBe(true);
        expect(shouldSuggestBreak(profile, 5)).toBe(false);
      });
    });

    describe('getRecommendedInputMethod', () => {
      it('should return keyboard for non-CP', () => {
        const profile = createTestProfile({ cerebralPalsy: false });
        expect(getRecommendedInputMethod(profile)).toBe(InputMethod.KEYBOARD);
      });

      it('should return voice for severe CP', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.SEVERE });
        expect(getRecommendedInputMethod(profile)).toBe(InputMethod.VOICE);
      });

      it('should return both for moderate CP', () => {
        const profile = createTestProfile({ cerebralPalsy: true, cerebralPalsySeverity: Severity.MODERATE });
        expect(getRecommendedInputMethod(profile)).toBe(InputMethod.BOTH);
      });
    });
  });

  // ============================================================================
  // AUTISM SUPPORT (AU01-06)
  // ============================================================================
  describe('Autism Support', () => {
    describe('shouldAvoidMetaphors', () => {
      it('should return false for non-autistic', () => {
        const profile = createTestProfile({ autism: false });
        expect(shouldAvoidMetaphors(profile)).toBe(false);
      });

      it('should return false for mild autism', () => {
        const profile = createTestProfile({ autism: true, autismSeverity: Severity.MILD });
        expect(shouldAvoidMetaphors(profile)).toBe(false);
      });

      it('should return true for moderate autism', () => {
        const profile = createTestProfile({ autism: true, autismSeverity: Severity.MODERATE });
        expect(shouldAvoidMetaphors(profile)).toBe(true);
      });
    });

    describe('containsMetaphors', () => {
      it('should detect English metaphors', () => {
        expect(containsMetaphors('It is raining cats and dogs')).toBe(true);
        expect(containsMetaphors('This is a piece of cake')).toBe(true);
      });

      it('should detect Italian metaphors', () => {
        expect(containsMetaphors('In bocca al lupo!')).toBe(true);
      });

      it('should return false for literal text', () => {
        expect(containsMetaphors('It is raining heavily outside')).toBe(false);
      });
    });

    describe('getStructurePrefix', () => {
      it('should return correct prefix for known section types', () => {
        expect(getStructurePrefix('introduction')).toContain('Introduzione');
        expect(getStructurePrefix('explanation')).toContain('Spiegazione');
        expect(getStructurePrefix('example')).toContain('Esempio');
        expect(getStructurePrefix('exercise')).toContain('Esercizio');
        expect(getStructurePrefix('summary')).toContain('Riepilogo');
      });

      it('should return generic prefix for unknown types', () => {
        const result = getStructurePrefix('custom');
        expect(result).toContain('custom');
      });
    });

    describe('getTopicChangeWarning', () => {
      it('should include both topics', () => {
        const warning = getTopicChangeWarning('matematica', 'storia');
        expect(warning).toContain('matematica');
        expect(warning).toContain('storia');
        expect(warning).toContain('Cambio di argomento');
      });
    });

    describe('shouldAvoidSocialPressure', () => {
      it('should return false for non-autistic', () => {
        const profile = createTestProfile({ autism: false });
        expect(shouldAvoidSocialPressure(profile)).toBe(false);
      });

      it('should return true for moderate autism', () => {
        const profile = createTestProfile({ autism: true, autismSeverity: Severity.MODERATE });
        expect(shouldAvoidSocialPressure(profile)).toBe(true);
      });
    });

    describe('shouldReduceMotion', () => {
      it('should return true for autistic profile', () => {
        const profile = createTestProfile({ autism: true });
        expect(shouldReduceMotion(profile)).toBe(true);
      });

      it('should return true when reduceMotion is enabled', () => {
        const profile = createTestProfile({ reduceMotion: true });
        expect(shouldReduceMotion(profile)).toBe(true);
      });

      it('should return false for normal profile', () => {
        const profile = createTestProfile();
        expect(shouldReduceMotion(profile)).toBe(false);
      });
    });
  });

  // ============================================================================
  // COMBINED ADAPTATIONS
  // ============================================================================
  describe('Combined Adaptations', () => {
    describe('adaptContent', () => {
      it('should apply dyslexia adaptations', () => {
        const profile = createTestProfile({ dyslexia: true, dyslexiaSeverity: Severity.MODERATE });
        const result = adaptContent('casa bella', profile);
        expect(result.length).toBeGreaterThanOrEqual('casa bella'.length);
      });

      it('should apply ADHD bullet limiting', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.SEVERE });
        const text = '- Item 1\n- Item 2\n- Item 3\n- Item 4\n- Item 5';
        const result = adaptContent(text, profile);
        expect(result).toContain('altri');
      });
    });

    describe('getAccessibilityCSS', () => {
      it('should include font family', () => {
        const profile = createTestProfile({ dyslexia: true });
        const css = getAccessibilityCSS(profile);
        expect(css.fontFamily).toContain('OpenDyslexic');
      });

      it('should include correct font size for large', () => {
        const profile = createTestProfile({ fontSize: 'large' });
        const css = getAccessibilityCSS(profile);
        expect(css.fontSize).toBe('1.2rem');
      });

      it('should include correct font size for x-large', () => {
        const profile = createTestProfile({ fontSize: 'x-large' });
        const css = getAccessibilityCSS(profile);
        expect(css.fontSize).toBe('1.5rem');
      });

      it('should add letter spacing for dyslexia', () => {
        const profile = createTestProfile({ dyslexia: true });
        const css = getAccessibilityCSS(profile);
        expect(css.letterSpacing).toBe('0.05em');
        expect(css.wordSpacing).toBe('0.16em');
      });

      it('should reduce motion when needed', () => {
        const profile = createTestProfile({ reduceMotion: true });
        const css = getAccessibilityCSS(profile);
        expect(css.animationDuration).toBe('0s');
        expect(css.transitionDuration).toBe('0s');
      });
    });

    describe('getAdaptationsSummary', () => {
      it('should include dyslexia adaptations', () => {
        const profile = createTestProfile({ dyslexia: true, dyslexiaSeverity: Severity.MODERATE });
        const summary = getAdaptationsSummary(profile);
        expect(summary.some(s => s.includes('Dislessia'))).toBe(true);
      });

      it('should include ADHD adaptations', () => {
        const profile = createTestProfile({ adhd: true, adhdSeverity: Severity.MODERATE });
        const summary = getAdaptationsSummary(profile);
        expect(summary.some(s => s.includes('ADHD'))).toBe(true);
      });

      it('should include TTS info when enabled', () => {
        const profile = createTestProfile({ ttsEnabled: true, ttsSpeed: 1.5 });
        const summary = getAdaptationsSummary(profile);
        expect(summary.some(s => s.includes('Text-to-Speech'))).toBe(true);
      });
    });
  });

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  describe('Utility Functions', () => {
    describe('createDefaultProfile', () => {
      it('should create profile with all defaults', () => {
        const profile = createDefaultProfile();
        expect(profile.dyslexia).toBe(false);
        expect(profile.adhd).toBe(false);
        expect(profile.autism).toBe(false);
        expect(profile.cerebralPalsy).toBe(false);
        expect(profile.ttsEnabled).toBe(false);
        expect(profile.fontSize).toBe('normal');
      });
    });

    describe('mergeWithAccessibilitySettings', () => {
      it('should merge settings into profile', () => {
        const profile = createDefaultProfile();
        const settings = {
          ttsEnabled: true,
          ttsSpeed: 1.5,
          highContrast: true,
        };
        const merged = mergeWithAccessibilitySettings(profile, settings);
        expect(merged.ttsEnabled).toBe(true);
        expect(merged.ttsSpeed).toBe(1.5);
        expect(merged.highContrast).toBe(true);
      });

      it('should use profile values when settings are undefined', () => {
        const profile = createTestProfile({ ttsEnabled: true, ttsSpeed: 2.0 });
        const settings = {};
        const merged = mergeWithAccessibilitySettings(profile, settings);
        expect(merged.ttsEnabled).toBe(true);
        expect(merged.ttsSpeed).toBe(2.0);
      });

      it('should map dyslexiaFont to dyslexia', () => {
        const profile = createDefaultProfile();
        const settings = { dyslexiaFont: true };
        const merged = mergeWithAccessibilitySettings(profile, settings);
        expect(merged.dyslexia).toBe(true);
      });
    });
  });
});
