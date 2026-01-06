/**
 * Tests for PDF Generator Profiles
 * @module pdf-generator/profiles
 */

import { describe, it, expect } from 'vitest';
import {
  getProfile,
  getAllProfiles,
  profiles,
  dyslexiaProfile,
  dyscalculiaProfile,
  dysgraphiaProfile,
  dysorthographyProfile,
  adhdProfile,
  dyspraxiaProfile,
  stutteringProfile,
  operatorColors,
  wordPartColors,
} from '../profiles';
import type { DSAProfile, ProfileConfig as _ProfileConfig } from '../types';

describe('PDF Generator Profiles', () => {
  describe('getProfile', () => {
    it('should return dyslexia profile for "dyslexia"', () => {
      const profile = getProfile('dyslexia');
      expect(profile).toBe(dyslexiaProfile);
      expect(profile.name).toBe('dyslexia');
      expect(profile.nameIt).toBe('Dislessia');
    });

    it('should return dyscalculia profile for "dyscalculia"', () => {
      const profile = getProfile('dyscalculia');
      expect(profile).toBe(dyscalculiaProfile);
      expect(profile.name).toBe('dyscalculia');
    });

    it('should return dysgraphia profile for "dysgraphia"', () => {
      const profile = getProfile('dysgraphia');
      expect(profile).toBe(dysgraphiaProfile);
      expect(profile.name).toBe('dysgraphia');
    });

    it('should return dysorthography profile for "dysorthography"', () => {
      const profile = getProfile('dysorthography');
      expect(profile).toBe(dysorthographyProfile);
      expect(profile.name).toBe('dysorthography');
    });

    it('should return adhd profile for "adhd"', () => {
      const profile = getProfile('adhd');
      expect(profile).toBe(adhdProfile);
      expect(profile.name).toBe('adhd');
    });

    it('should return dyspraxia profile for "dyspraxia"', () => {
      const profile = getProfile('dyspraxia');
      expect(profile).toBe(dyspraxiaProfile);
      expect(profile.name).toBe('dyspraxia');
    });

    it('should return stuttering profile for "stuttering"', () => {
      const profile = getProfile('stuttering');
      expect(profile).toBe(stutteringProfile);
      expect(profile.name).toBe('stuttering');
    });

    it('should return undefined for invalid profile', () => {
      const profile = getProfile('invalid' as DSAProfile);
      expect(profile).toBeUndefined();
    });
  });

  describe('getAllProfiles', () => {
    it('should return all 7 profiles', () => {
      const allProfiles = getAllProfiles();
      expect(allProfiles).toHaveLength(7);
    });

    it('should include all profile types', () => {
      const allProfiles = getAllProfiles();
      const names = allProfiles.map((p) => p.name);
      expect(names).toContain('dyslexia');
      expect(names).toContain('dyscalculia');
      expect(names).toContain('dysgraphia');
      expect(names).toContain('dysorthography');
      expect(names).toContain('adhd');
      expect(names).toContain('dyspraxia');
      expect(names).toContain('stuttering');
    });
  });

  describe('profiles object', () => {
    it('should have 7 profiles', () => {
      expect(Object.keys(profiles)).toHaveLength(7);
    });

    it('should map profile names to ProfileConfig objects', () => {
      Object.entries(profiles).forEach(([key, value]) => {
        expect(value.name).toBe(key);
        expect(typeof value.nameIt).toBe('string');
        expect(typeof value.description).toBe('string');
      });
    });
  });

  describe('Profile Configuration', () => {
    const allProfiles = getAllProfiles();

    allProfiles.forEach((profile) => {
      describe(`${profile.name} profile`, () => {
        it('should have valid font configuration', () => {
          expect(profile.fontFamily).toBe('Helvetica');
          expect(profile.fontSize).toBeGreaterThan(0);
          expect(profile.fontSize).toBeLessThanOrEqual(20);
        });

        it('should have valid spacing configuration', () => {
          expect(profile.lineHeight).toBeGreaterThanOrEqual(1.0);
          expect(profile.lineHeight).toBeLessThanOrEqual(2.5);
          expect(profile.letterSpacing).toBeGreaterThanOrEqual(0);
          expect(profile.wordSpacing).toBeGreaterThanOrEqual(0);
          expect(profile.paragraphSpacing).toBeGreaterThan(0);
        });

        it('should have valid color configuration', () => {
          expect(profile.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(profile.textColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        });

        it('should have valid heading scale', () => {
          expect(profile.headingScale).toBeGreaterThan(1.0);
          expect(profile.headingScale).toBeLessThanOrEqual(1.5);
        });

        it('should have options object', () => {
          expect(typeof profile.options).toBe('object');
          expect(profile.options).not.toBeNull();
        });
      });
    });
  });

  describe('Dyslexia Profile Specifics', () => {
    it('should have dyslexia-specific options', () => {
      expect(dyslexiaProfile.options.dyslexiaFont).toBe(true);
      expect(dyslexiaProfile.options.warmBackground).toBe(true);
      expect(dyslexiaProfile.options.extraSpacing).toBe(true);
    });

    it('should have warm background color', () => {
      expect(dyslexiaProfile.backgroundColor).toBe('#fffbeb');
    });

    it('should have larger font size', () => {
      expect(dyslexiaProfile.fontSize).toBe(18);
    });

    it('should have increased line height', () => {
      expect(dyslexiaProfile.lineHeight).toBe(1.8);
    });
  });

  describe('Dyscalculia Profile Specifics', () => {
    it('should have dyscalculia-specific options', () => {
      expect(dyscalculiaProfile.options.largeNumbers).toBe(true);
      expect(dyscalculiaProfile.options.coloredOperators).toBe(true);
      expect(dyscalculiaProfile.options.gridLines).toBe(true);
      expect(dyscalculiaProfile.options.stepByStep).toBe(true);
    });

    it('should have white background for number clarity', () => {
      expect(dyscalculiaProfile.backgroundColor).toBe('#ffffff');
    });
  });

  describe('ADHD Profile Specifics', () => {
    it('should have adhd-specific options', () => {
      expect(adhdProfile.options.distractionFree).toBe(true);
      expect(adhdProfile.options.clearSections).toBe(true);
      expect(adhdProfile.options.bulletPoints).toBe(true);
      expect(adhdProfile.options.shortParagraphs).toBe(true);
      expect(adhdProfile.options.progressIndicators).toBe(true);
      expect(adhdProfile.options.highlightKeyTerms).toBe(true);
    });

    it('should have larger paragraph spacing', () => {
      expect(adhdProfile.paragraphSpacing).toBe(28);
    });
  });

  describe('Dyspraxia Profile Specifics', () => {
    it('should have dyspraxia-specific options', () => {
      expect(dyspraxiaProfile.options.syllableUnderlines).toBe(true);
      expect(dyspraxiaProfile.options.readingTimeEstimate).toBe(true);
      expect(dyspraxiaProfile.options.pauseMarkers).toBe(true);
      expect(dyspraxiaProfile.options.chunkedText).toBe(true);
    });

    it('should have warm background', () => {
      expect(dyspraxiaProfile.backgroundColor).toBe('#fefce8');
    });
  });

  describe('Stuttering Profile Specifics', () => {
    it('should have stuttering-specific options', () => {
      expect(stutteringProfile.options.simplePunctuation).toBe(true);
      expect(stutteringProfile.options.shortSentences).toBe(true);
      expect(stutteringProfile.options.breathingMarks).toBe(true);
      expect(stutteringProfile.options.rhythmicLayout).toBe(true);
    });

    it('should have highest line height for breathing space', () => {
      expect(stutteringProfile.lineHeight).toBe(1.9);
    });
  });

  describe('Operator Colors (Dyscalculia)', () => {
    it('should have distinct colors for operators', () => {
      expect(operatorColors.plus).toBe('#059669');
      expect(operatorColors.minus).toBe('#dc2626');
      expect(operatorColors.multiply).toBe('#2563eb');
      expect(operatorColors.divide).toBe('#7c3aed');
      expect(operatorColors.equals).toBe('#64748b');
    });

    it('should have valid hex colors', () => {
      Object.values(operatorColors).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('Word Part Colors (Dysorthography)', () => {
    it('should have distinct colors for word parts', () => {
      expect(wordPartColors.prefix).toBe('#2563eb');
      expect(wordPartColors.root).toBe('#1e293b');
      expect(wordPartColors.suffix).toBe('#059669');
    });

    it('should have valid hex colors', () => {
      Object.values(wordPartColors).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });
});
