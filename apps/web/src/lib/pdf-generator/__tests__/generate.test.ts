/**
 * Tests for PDF Generator Functions
 * @module pdf-generator/generate
 */

import { describe, it, expect } from 'vitest';
import { isValidProfile, getAvailableProfiles } from '../generate';

describe('PDF Generator Functions', () => {
  describe('isValidProfile', () => {
    it('should return true for "dyslexia"', () => {
      expect(isValidProfile('dyslexia')).toBe(true);
    });

    it('should return true for "dyscalculia"', () => {
      expect(isValidProfile('dyscalculia')).toBe(true);
    });

    it('should return true for "dysgraphia"', () => {
      expect(isValidProfile('dysgraphia')).toBe(true);
    });

    it('should return true for "dysorthography"', () => {
      expect(isValidProfile('dysorthography')).toBe(true);
    });

    it('should return true for "adhd"', () => {
      expect(isValidProfile('adhd')).toBe(true);
    });

    it('should return true for "dyspraxia"', () => {
      expect(isValidProfile('dyspraxia')).toBe(true);
    });

    it('should return true for "stuttering"', () => {
      expect(isValidProfile('stuttering')).toBe(true);
    });

    it('should return false for invalid profile', () => {
      expect(isValidProfile('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidProfile('')).toBe(false);
    });

    it('should return false for null-like values', () => {
      expect(isValidProfile('null')).toBe(false);
      expect(isValidProfile('undefined')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isValidProfile('Dyslexia')).toBe(false);
      expect(isValidProfile('DYSLEXIA')).toBe(false);
      expect(isValidProfile('ADHD')).toBe(false);
    });

    it('should not accept partial matches', () => {
      expect(isValidProfile('dys')).toBe(false);
      expect(isValidProfile('dyslexiaProfile')).toBe(false);
    });
  });

  describe('getAvailableProfiles', () => {
    it('should return 7 profiles', () => {
      const profiles = getAvailableProfiles();
      expect(profiles).toHaveLength(7);
    });

    it('should return profiles with correct structure', () => {
      const profiles = getAvailableProfiles();
      profiles.forEach((profile) => {
        expect(profile).toHaveProperty('value');
        expect(profile).toHaveProperty('label');
        expect(profile).toHaveProperty('description');
        expect(typeof profile.value).toBe('string');
        expect(typeof profile.label).toBe('string');
        expect(typeof profile.description).toBe('string');
      });
    });

    it('should include all DSA profile values', () => {
      const profiles = getAvailableProfiles();
      const values = profiles.map((p) => p.value);
      expect(values).toContain('dyslexia');
      expect(values).toContain('dyscalculia');
      expect(values).toContain('dysgraphia');
      expect(values).toContain('dysorthography');
      expect(values).toContain('adhd');
      expect(values).toContain('dyspraxia');
      expect(values).toContain('stuttering');
    });

    it('should have Italian labels', () => {
      const profiles = getAvailableProfiles();
      const dyslexia = profiles.find((p) => p.value === 'dyslexia');
      expect(dyslexia?.label).toBe('Dislessia');

      const adhd = profiles.find((p) => p.value === 'adhd');
      expect(adhd?.label).toBe('DOP/ADHD');

      const stuttering = profiles.find((p) => p.value === 'stuttering');
      expect(stuttering?.label).toBe('Balbuzie');
    });

    it('should have non-empty descriptions', () => {
      const profiles = getAvailableProfiles();
      profiles.forEach((profile) => {
        expect(profile.description.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptions in Italian', () => {
      const profiles = getAvailableProfiles();
      const dyslexia = profiles.find((p) => p.value === 'dyslexia');
      expect(dyslexia?.description).toContain('spaziatura');

      const dyscalculia = profiles.find((p) => p.value === 'dyscalculia');
      expect(dyscalculia?.description).toContain('Numeri');
    });

    it('should return consistent results on multiple calls', () => {
      const profiles1 = getAvailableProfiles();
      const profiles2 = getAvailableProfiles();
      expect(profiles1).toEqual(profiles2);
    });
  });
});
