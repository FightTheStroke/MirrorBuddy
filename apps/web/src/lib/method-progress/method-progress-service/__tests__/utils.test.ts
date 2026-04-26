/**
 * Tests for Method Progress Service Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSkillLevel,
  calculateHelpBehaviorLevel,
  calculateProgressPercentage,
  getNestedValue,
} from '../utils';
import type { HelpBehavior } from '../../types';

describe('method-progress-service-utils', () => {
  describe('calculateSkillLevel', () => {
    it('returns novice for 0%', () => {
      expect(calculateSkillLevel(0, 100)).toBe('novice');
    });

    it('returns novice for values below 25%', () => {
      expect(calculateSkillLevel(24, 100)).toBe('novice');
      expect(calculateSkillLevel(10, 100)).toBe('novice');
    });

    it('returns learning for values 25%-59%', () => {
      expect(calculateSkillLevel(25, 100)).toBe('learning');
      expect(calculateSkillLevel(50, 100)).toBe('learning');
      expect(calculateSkillLevel(59, 100)).toBe('learning');
    });

    it('returns competent for values 60%-84%', () => {
      expect(calculateSkillLevel(60, 100)).toBe('competent');
      expect(calculateSkillLevel(75, 100)).toBe('competent');
      expect(calculateSkillLevel(84, 100)).toBe('competent');
    });

    it('returns expert for values 85%+', () => {
      expect(calculateSkillLevel(85, 100)).toBe('expert');
      expect(calculateSkillLevel(90, 100)).toBe('expert');
      expect(calculateSkillLevel(100, 100)).toBe('expert');
    });

    it('handles custom max values', () => {
      expect(calculateSkillLevel(5, 10)).toBe('learning'); // 50%
      expect(calculateSkillLevel(8, 10)).toBe('competent'); // 80%
      expect(calculateSkillLevel(9, 10)).toBe('expert'); // 90%
    });

    it('handles edge case: max is 0', () => {
      // Division by zero produces NaN, which fails all >= comparisons
      expect(calculateSkillLevel(0, 0)).toBe('novice');
    });
  });

  describe('calculateHelpBehaviorLevel', () => {
    const createBehavior = (partial: Partial<HelpBehavior> = {}): HelpBehavior => ({
      questionsAsked: 0,
      selfCorrections: 0,
      solvedAlone: 0,
      avgTimeBeforeAsking: 0,
      level: 'novice',
      ...partial,
    });

    it('returns novice when no actions taken', () => {
      const behavior = createBehavior();
      expect(calculateHelpBehaviorLevel(behavior)).toBe('novice');
    });

    it('returns novice for low independence ratio', () => {
      const behavior = createBehavior({
        questionsAsked: 10,
        solvedAlone: 1, // 9% independence
      });
      expect(calculateHelpBehaviorLevel(behavior)).toBe('novice');
    });

    it('returns learning for moderate independence', () => {
      const behavior = createBehavior({
        questionsAsked: 5,
        solvedAlone: 5, // 50% independence
      });
      expect(calculateHelpBehaviorLevel(behavior)).toBe('learning');
    });

    it('returns competent for high independence', () => {
      const behavior = createBehavior({
        questionsAsked: 2,
        solvedAlone: 8, // 80% independence
      });
      expect(calculateHelpBehaviorLevel(behavior)).toBe('competent');
    });

    it('returns expert for very high independence with bonuses', () => {
      const behavior = createBehavior({
        questionsAsked: 1,
        solvedAlone: 9, // 90% independence
        selfCorrections: 4, // +20% bonus (capped)
      });
      expect(calculateHelpBehaviorLevel(behavior)).toBe('expert');
    });

    it('adds self-correction bonus capped at 20%', () => {
      const behavior = createBehavior({
        questionsAsked: 3,
        solvedAlone: 7, // 70%
        selfCorrections: 10, // Would be 50% but capped at 20%
      });
      // 70% + 20% = 90% = expert
      expect(calculateHelpBehaviorLevel(behavior)).toBe('expert');
    });

    it('adds time bonus for patience before asking', () => {
      const behavior = createBehavior({
        questionsAsked: 5,
        solvedAlone: 5, // 50%
        avgTimeBeforeAsking: 90, // 90 seconds = 15% bonus (capped)
      });
      // 50% + 15% = 65% = competent
      expect(calculateHelpBehaviorLevel(behavior)).toBe('competent');
    });

    it('caps time bonus at 15%', () => {
      const behavior = createBehavior({
        questionsAsked: 5,
        solvedAlone: 5, // 50%
        avgTimeBeforeAsking: 600, // 10 minutes, but capped at 15%
      });
      // 50% + 15% = 65% = competent
      expect(calculateHelpBehaviorLevel(behavior)).toBe('competent');
    });

    it('combines all bonuses', () => {
      const behavior = createBehavior({
        questionsAsked: 3,
        solvedAlone: 5, // 62.5%
        selfCorrections: 2, // +10%
        avgTimeBeforeAsking: 30, // +5%
      });
      // 62.5% + 10% + 5% = 77.5% = competent
      expect(calculateHelpBehaviorLevel(behavior)).toBe('competent');
    });
  });

  describe('calculateProgressPercentage', () => {
    it('returns 100 for expert', () => {
      expect(calculateProgressPercentage('expert')).toBe(100);
    });

    it('returns 70 for competent', () => {
      expect(calculateProgressPercentage('competent')).toBe(70);
    });

    it('returns 40 for learning', () => {
      expect(calculateProgressPercentage('learning')).toBe(40);
    });

    it('returns 15 for novice', () => {
      expect(calculateProgressPercentage('novice')).toBe(15);
    });
  });

  describe('getNestedValue', () => {
    it('gets top-level number value', () => {
      const obj = { score: 42 };
      expect(getNestedValue(obj, 'score')).toBe(42);
    });

    it('gets nested number value', () => {
      const obj = { user: { stats: { score: 100 } } };
      expect(getNestedValue(obj, 'user.stats.score')).toBe(100);
    });

    it('returns array length for array values', () => {
      const obj = { items: ['a', 'b', 'c'] };
      expect(getNestedValue(obj, 'items')).toBe(3);
    });

    it('returns 0 for missing property', () => {
      const obj = { foo: 1 };
      expect(getNestedValue(obj, 'bar')).toBe(0);
    });

    it('returns 0 for missing nested property', () => {
      const obj = { foo: { bar: 1 } };
      expect(getNestedValue(obj, 'foo.baz.qux')).toBe(0);
    });

    it('returns 0 for null value in path', () => {
      const obj = { foo: null };
      expect(getNestedValue(obj, 'foo.bar')).toBe(0);
    });

    it('returns 0 for undefined value in path', () => {
      const obj = { foo: undefined };
      expect(getNestedValue(obj, 'foo.bar')).toBe(0);
    });

    it('returns 0 for non-number, non-array values', () => {
      const obj = { name: 'test' };
      expect(getNestedValue(obj, 'name')).toBe(0);
    });

    it('handles empty path', () => {
      const obj = { foo: 1 };
      expect(getNestedValue(obj, '')).toBe(0);
    });

    it('handles null object', () => {
      expect(getNestedValue(null, 'foo')).toBe(0);
    });

    it('handles undefined object', () => {
      expect(getNestedValue(undefined, 'foo')).toBe(0);
    });

    it('handles deeply nested arrays', () => {
      const obj = {
        methodTransfer: {
          subjectsApplied: ['matematica', 'italiano', 'scienze'],
        },
      };
      expect(getNestedValue(obj, 'methodTransfer.subjectsApplied')).toBe(3);
    });
  });
});
