/**
 * Unit tests for Adaptive Difficulty Profile management
 */

import { describe, it, expect } from 'vitest';
import {
  createDefaultAdaptiveProfile,
  parseAdaptiveProfile,
  updateGlobalSignals,
  updateSubjectSignals,
  ensureSubjectProfile,
} from '../adaptive-difficulty-profile';
import type { AdaptiveProfile, AdaptiveSignalInput } from '@/types';

describe('adaptive-difficulty-profile', () => {
  describe('createDefaultAdaptiveProfile', () => {
    it('creates profile with default values', () => {
      const profile = createDefaultAdaptiveProfile();

      expect(profile.global.frustration).toBe(0);
      expect(profile.global.repeatRate).toBe(0);
      expect(profile.global.questionRate).toBe(0);
      expect(profile.global.averageResponseMs).toBe(12000);
      expect(profile.subjects).toEqual({});
      expect(profile.updatedAt).toBeDefined();
    });
  });

  describe('parseAdaptiveProfile', () => {
    it('returns default profile for null/undefined input', () => {
      expect(parseAdaptiveProfile(null).global.frustration).toBe(0);
      expect(parseAdaptiveProfile(undefined).global.frustration).toBe(0);
      expect(parseAdaptiveProfile('{}').global.frustration).toBe(0);
    });

    it('parses valid JSON profile', () => {
      const validProfile: AdaptiveProfile = {
        global: {
          frustration: 0.5,
          repeatRate: 0.3,
          questionRate: 0.2,
          averageResponseMs: 8000,
          lastUpdatedAt: new Date().toISOString(),
        },
        subjects: {
          math: {
            mastery: 75,
            targetDifficulty: 4,
            lastUpdatedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      };

      const parsed = parseAdaptiveProfile(JSON.stringify(validProfile));

      expect(parsed.global.frustration).toBe(0.5);
      expect(parsed.subjects.math.mastery).toBe(75);
    });

    it('returns default for invalid JSON', () => {
      const profile = parseAdaptiveProfile('not valid json');
      expect(profile.global.frustration).toBe(0);
    });

    it('returns default for corrupted profile structure', () => {
      // Missing required fields
      const corrupted = JSON.stringify({ foo: 'bar' });
      const profile = parseAdaptiveProfile(corrupted);
      expect(profile.global.frustration).toBe(0);
    });

    it('returns default for profile with invalid values', () => {
      // frustration out of range
      const invalid = JSON.stringify({
        global: {
          frustration: 999, // Invalid: > 1
          repeatRate: 0,
          questionRate: 0,
          averageResponseMs: 12000,
          lastUpdatedAt: new Date().toISOString(),
        },
        subjects: {},
        updatedAt: new Date().toISOString(),
      });

      const profile = parseAdaptiveProfile(invalid);
      expect(profile.global.frustration).toBe(0); // Should return default
    });
  });

  describe('updateGlobalSignals', () => {
    const createProfile = (): AdaptiveProfile =>
      createDefaultAdaptiveProfile();

    it('updates frustration signal with decay', () => {
      const profile = createProfile();
      profile.global.frustration = 0.5;

      const signal: AdaptiveSignalInput = {
        type: 'frustration',
        source: 'chat',
        value: 1,
      };

      updateGlobalSignals(profile, signal);

      // Should decay existing (0.5 * 0.9 = 0.45) then apply EMA
      expect(profile.global.frustration).toBeGreaterThan(0.45);
      expect(profile.global.frustration).toBeLessThan(1);
    });

    it('updates repeatRate signal', () => {
      const profile = createProfile();

      const signal: AdaptiveSignalInput = {
        type: 'repeat_request',
        source: 'voice',
      };

      updateGlobalSignals(profile, signal);

      expect(profile.global.repeatRate).toBeGreaterThan(0);
    });

    it('updates questionRate signal', () => {
      const profile = createProfile();

      const signal: AdaptiveSignalInput = {
        type: 'question',
        source: 'chat',
      };

      updateGlobalSignals(profile, signal);

      expect(profile.global.questionRate).toBeGreaterThan(0);
    });

    it('updates response time signal', () => {
      const profile = createProfile();

      const signal: AdaptiveSignalInput = {
        type: 'response_time_ms',
        source: 'chat',
        responseTimeMs: 5000,
      };

      updateGlobalSignals(profile, signal);

      // EMA between 12000 and 5000
      expect(profile.global.averageResponseMs).toBeLessThan(12000);
      expect(profile.global.averageResponseMs).toBeGreaterThan(5000);
    });

    it('ignores zero response time but applies decay', () => {
      const profile = createProfile();
      const originalMs = profile.global.averageResponseMs;

      const signal: AdaptiveSignalInput = {
        type: 'response_time_ms',
        source: 'chat',
        responseTimeMs: 0,
      };

      updateGlobalSignals(profile, signal);

      // Decay is applied, but no EMA update for responseTimeMs=0
      // averageResponseMs should stay the same (decay doesn't affect it in switch)
      expect(profile.global.averageResponseMs).toBe(originalMs);
    });
  });

  describe('ensureSubjectProfile', () => {
    it('creates new subject profile if not exists', () => {
      const profile = createDefaultAdaptiveProfile();

      const subjectProfile = ensureSubjectProfile(profile, 'math');

      expect(subjectProfile).not.toBeNull();
      expect(subjectProfile?.mastery).toBe(50);
      expect(subjectProfile?.targetDifficulty).toBe(3);
      expect(profile.subjects.math).toBeDefined();
    });

    it('returns existing subject profile', () => {
      const profile = createDefaultAdaptiveProfile();
      profile.subjects.math = {
        mastery: 80,
        targetDifficulty: 4,
        lastUpdatedAt: new Date().toISOString(),
      };

      const subjectProfile = ensureSubjectProfile(profile, 'math');

      expect(subjectProfile?.mastery).toBe(80);
    });

    it('normalizes subject name to lowercase', () => {
      const profile = createDefaultAdaptiveProfile();

      ensureSubjectProfile(profile, 'MATH');

      expect(profile.subjects.math).toBeDefined();
      expect(profile.subjects.MATH).toBeUndefined();
    });

    it('returns null for undefined subject', () => {
      const profile = createDefaultAdaptiveProfile();

      const result = ensureSubjectProfile(profile, undefined);

      expect(result).toBeNull();
    });
  });

  describe('updateSubjectSignals', () => {
    it('updates mastery from quiz result', () => {
      const profile = createDefaultAdaptiveProfile();
      profile.subjects.math = {
        mastery: 50,
        targetDifficulty: 3,
        lastUpdatedAt: new Date().toISOString(),
      };

      const signal: AdaptiveSignalInput = {
        type: 'quiz_result',
        source: 'quiz',
        subject: 'math',
        value: 90,
      };

      updateSubjectSignals(profile, signal);

      expect(profile.subjects.math.mastery).toBeGreaterThan(50);
      expect(profile.subjects.math.lastQuizScore).toBe(90);
    });

    it('updates mastery from flashcard rating - easy', () => {
      const profile = createDefaultAdaptiveProfile();
      profile.subjects.history = {
        mastery: 50,
        targetDifficulty: 3,
        lastUpdatedAt: new Date().toISOString(),
      };

      const signal: AdaptiveSignalInput = {
        type: 'flashcard_rating',
        source: 'flashcard',
        subject: 'history',
        rating: 'easy',
      };

      updateSubjectSignals(profile, signal);

      expect(profile.subjects.history.mastery).toBe(54); // 50 + 4
    });

    it('updates mastery from flashcard rating - again', () => {
      const profile = createDefaultAdaptiveProfile();
      profile.subjects.science = {
        mastery: 50,
        targetDifficulty: 3,
        lastUpdatedAt: new Date().toISOString(),
      };

      const signal: AdaptiveSignalInput = {
        type: 'flashcard_rating',
        source: 'flashcard',
        subject: 'science',
        rating: 'again',
      };

      updateSubjectSignals(profile, signal);

      expect(profile.subjects.science.mastery).toBe(44); // 50 - 6
    });

    it('clamps mastery to valid range', () => {
      const profile = createDefaultAdaptiveProfile();
      profile.subjects.art = {
        mastery: 98,
        targetDifficulty: 3,
        lastUpdatedAt: new Date().toISOString(),
      };

      const signal: AdaptiveSignalInput = {
        type: 'flashcard_rating',
        source: 'flashcard',
        subject: 'art',
        rating: 'easy', // Would add 4, making 102
      };

      updateSubjectSignals(profile, signal);

      expect(profile.subjects.art.mastery).toBe(100); // Clamped
    });

    it('creates subject profile if not exists', () => {
      const profile = createDefaultAdaptiveProfile();

      const signal: AdaptiveSignalInput = {
        type: 'quiz_result',
        source: 'quiz',
        subject: 'newsubject',
        value: 70,
      };

      updateSubjectSignals(profile, signal);

      expect(profile.subjects.newsubject).toBeDefined();
      expect(profile.subjects.newsubject.mastery).toBeGreaterThan(50);
    });
  });
});
