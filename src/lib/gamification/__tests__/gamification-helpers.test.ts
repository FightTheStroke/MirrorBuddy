/**
 * Tests for Gamification Helpers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentSeason,
  calculateLevel,
  calculateTier,
  calculateStreakMultiplier,
  checkAchievementRequirement,
} from '../gamification-helpers';

describe('gamification-helpers', () => {
  describe('getCurrentSeason', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns Q1 for January', () => {
      vi.setSystemTime(new Date('2024-01-15'));
      expect(getCurrentSeason()).toBe('2024-Q1');
    });

    it('returns Q1 for March', () => {
      vi.setSystemTime(new Date('2024-03-31'));
      expect(getCurrentSeason()).toBe('2024-Q1');
    });

    it('returns Q2 for April', () => {
      vi.setSystemTime(new Date('2024-04-01'));
      expect(getCurrentSeason()).toBe('2024-Q2');
    });

    it('returns Q2 for June', () => {
      vi.setSystemTime(new Date('2024-06-15'));
      expect(getCurrentSeason()).toBe('2024-Q2');
    });

    it('returns Q3 for July', () => {
      vi.setSystemTime(new Date('2024-07-01'));
      expect(getCurrentSeason()).toBe('2024-Q3');
    });

    it('returns Q3 for September', () => {
      vi.setSystemTime(new Date('2024-09-30'));
      expect(getCurrentSeason()).toBe('2024-Q3');
    });

    it('returns Q4 for October', () => {
      vi.setSystemTime(new Date('2024-10-01'));
      expect(getCurrentSeason()).toBe('2024-Q4');
    });

    it('returns Q4 for December', () => {
      vi.setSystemTime(new Date('2024-12-31'));
      expect(getCurrentSeason()).toBe('2024-Q4');
    });

    it('includes correct year', () => {
      vi.setSystemTime(new Date('2025-06-15'));
      expect(getCurrentSeason()).toBe('2025-Q2');
    });
  });

  describe('calculateLevel', () => {
    it('returns level 1 for 0 points', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('returns level 1 for 999 points', () => {
      expect(calculateLevel(999)).toBe(1);
    });

    it('returns level 2 for 1000 points', () => {
      expect(calculateLevel(1000)).toBe(2);
    });

    it('returns level 10 for 9000 points', () => {
      expect(calculateLevel(9000)).toBe(10);
    });

    it('returns level 50 for 49000 points', () => {
      expect(calculateLevel(49000)).toBe(50);
    });

    it('caps at level 100 for 99000 points', () => {
      expect(calculateLevel(99000)).toBe(100);
    });

    it('caps at level 100 for very high points', () => {
      expect(calculateLevel(150000)).toBe(100);
    });

    it('handles negative points', () => {
      // Math.floor(-500/1000) + 1 = -1 + 1 = 0, then min(100, 0) = 0
      expect(calculateLevel(-500)).toBe(0);
    });
  });

  describe('calculateTier', () => {
    it('returns principiante for level 1', () => {
      expect(calculateTier(1)).toBe('principiante');
    });

    it('returns principiante for level 14', () => {
      expect(calculateTier(14)).toBe('principiante');
    });

    it('returns apprendista for level 15', () => {
      expect(calculateTier(15)).toBe('apprendista');
    });

    it('returns apprendista for level 29', () => {
      expect(calculateTier(29)).toBe('apprendista');
    });

    it('returns intermedio for level 30', () => {
      expect(calculateTier(30)).toBe('intermedio');
    });

    it('returns intermedio for level 44', () => {
      expect(calculateTier(44)).toBe('intermedio');
    });

    it('returns avanzato for level 45', () => {
      expect(calculateTier(45)).toBe('avanzato');
    });

    it('returns avanzato for level 59', () => {
      expect(calculateTier(59)).toBe('avanzato');
    });

    it('returns esperto for level 60', () => {
      expect(calculateTier(60)).toBe('esperto');
    });

    it('returns esperto for level 74', () => {
      expect(calculateTier(74)).toBe('esperto');
    });

    it('returns maestro for level 75', () => {
      expect(calculateTier(75)).toBe('maestro');
    });

    it('returns maestro for level 89', () => {
      expect(calculateTier(89)).toBe('maestro');
    });

    it('returns leggenda for level 90', () => {
      expect(calculateTier(90)).toBe('leggenda');
    });

    it('returns leggenda for level 100', () => {
      expect(calculateTier(100)).toBe('leggenda');
    });
  });

  describe('calculateStreakMultiplier', () => {
    it('returns 1.0 for 0 streak', () => {
      expect(calculateStreakMultiplier(0)).toBe(1.0);
    });

    it('returns 1.1 for 1 day streak', () => {
      expect(calculateStreakMultiplier(1)).toBe(1.1);
    });

    it('returns 1.1 for 2 day streak', () => {
      expect(calculateStreakMultiplier(2)).toBe(1.1);
    });

    it('returns 1.25 for 3 day streak', () => {
      expect(calculateStreakMultiplier(3)).toBe(1.25);
    });

    it('returns 1.25 for 6 day streak', () => {
      expect(calculateStreakMultiplier(6)).toBe(1.25);
    });

    it('returns 1.5 for 7 day streak', () => {
      expect(calculateStreakMultiplier(7)).toBe(1.5);
    });

    it('returns 1.5 for 30 day streak', () => {
      expect(calculateStreakMultiplier(30)).toBe(1.5);
    });
  });

  describe('checkAchievementRequirement', () => {
    const baseStats = { totalPoints: 5000, level: 10, currentStreak: 5 };

    it('returns true when total_points requirement is met', () => {
      expect(checkAchievementRequirement({ type: 'total_points', value: 5000 }, baseStats)).toBe(true);
    });

    it('returns false when total_points requirement is not met', () => {
      expect(checkAchievementRequirement({ type: 'total_points', value: 6000 }, baseStats)).toBe(false);
    });

    it('returns true when level requirement is met', () => {
      expect(checkAchievementRequirement({ type: 'level', value: 10 }, baseStats)).toBe(true);
    });

    it('returns false when level requirement is not met', () => {
      expect(checkAchievementRequirement({ type: 'level', value: 15 }, baseStats)).toBe(false);
    });

    it('returns true when streak requirement is met', () => {
      expect(checkAchievementRequirement({ type: 'streak', value: 5 }, baseStats)).toBe(true);
    });

    it('returns false when streak requirement is not met', () => {
      expect(checkAchievementRequirement({ type: 'streak', value: 7 }, baseStats)).toBe(false);
    });

    it('returns true for first_session when totalPoints > 0', () => {
      expect(checkAchievementRequirement({ type: 'first_session', value: 0 }, baseStats)).toBe(true);
    });

    it('returns false for first_session when totalPoints is 0', () => {
      expect(
        checkAchievementRequirement({ type: 'first_session', value: 0 }, { ...baseStats, totalPoints: 0 })
      ).toBe(false);
    });

    it('returns false for unknown requirement type', () => {
      expect(checkAchievementRequirement({ type: 'unknown', value: 0 }, baseStats)).toBe(false);
    });
  });
});
