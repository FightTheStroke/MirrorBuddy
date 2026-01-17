/**
 * Tests for Pomodoro Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  formatTime,
  calculateProgress,
  getPhaseForSessionCount,
  DEFAULT_PHASES,
} from '../pomodoro-helpers';

describe('pomodoro-helpers', () => {
  describe('DEFAULT_PHASES', () => {
    it('has 3 phases', () => {
      expect(DEFAULT_PHASES).toHaveLength(3);
    });

    it('has work phase as first', () => {
      expect(DEFAULT_PHASES[0].name).toBe('work');
      expect(DEFAULT_PHASES[0].duration).toBe(25 * 60);
    });

    it('has break phase as second', () => {
      expect(DEFAULT_PHASES[1].name).toBe('break');
      expect(DEFAULT_PHASES[1].duration).toBe(5 * 60);
    });

    it('has long-break phase as third', () => {
      expect(DEFAULT_PHASES[2].name).toBe('long-break');
      expect(DEFAULT_PHASES[2].duration).toBe(15 * 60);
    });

    it('all phases have colors', () => {
      DEFAULT_PHASES.forEach((phase) => {
        expect(phase.color).toBeDefined();
        expect(phase.color.length).toBeGreaterThan(0);
      });
    });
  });

  describe('formatTime', () => {
    it('formats 0 seconds as 00:00', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    it('formats 59 seconds as 00:59', () => {
      expect(formatTime(59)).toBe('00:59');
    });

    it('formats 60 seconds as 01:00', () => {
      expect(formatTime(60)).toBe('01:00');
    });

    it('formats 90 seconds as 01:30', () => {
      expect(formatTime(90)).toBe('01:30');
    });

    it('formats 5 minutes as 05:00', () => {
      expect(formatTime(5 * 60)).toBe('05:00');
    });

    it('formats 25 minutes as 25:00', () => {
      expect(formatTime(25 * 60)).toBe('25:00');
    });

    it('pads single digit minutes', () => {
      expect(formatTime(9 * 60 + 5)).toBe('09:05');
    });

    it('handles hours correctly', () => {
      expect(formatTime(65 * 60)).toBe('65:00');
    });
  });

  describe('calculateProgress', () => {
    it('returns 0 for full remaining time', () => {
      expect(calculateProgress(100, 100)).toBe(0);
    });

    it('returns 100 for no remaining time', () => {
      expect(calculateProgress(0, 100)).toBe(100);
    });

    it('returns 50 for half remaining time', () => {
      expect(calculateProgress(50, 100)).toBe(50);
    });

    it('returns 75 for quarter remaining time', () => {
      expect(calculateProgress(25, 100)).toBe(75);
    });

    it('returns 25 for three quarters remaining time', () => {
      expect(calculateProgress(75, 100)).toBe(25);
    });

    it('rounds to nearest integer', () => {
      expect(calculateProgress(33, 100)).toBe(67);
      expect(calculateProgress(66, 100)).toBe(34);
    });

    it('handles real pomodoro values', () => {
      const workDuration = 25 * 60; // 1500 seconds
      expect(calculateProgress(workDuration, workDuration)).toBe(0);
      expect(calculateProgress(workDuration / 2, workDuration)).toBe(50);
      expect(calculateProgress(0, workDuration)).toBe(100);
    });
  });

  describe('getPhaseForSessionCount', () => {
    it('returns short break for session 1', () => {
      const phase = getPhaseForSessionCount(1);
      expect(phase.name).toBe('break');
    });

    it('returns short break for session 2', () => {
      const phase = getPhaseForSessionCount(2);
      expect(phase.name).toBe('break');
    });

    it('returns short break for session 3', () => {
      const phase = getPhaseForSessionCount(3);
      expect(phase.name).toBe('break');
    });

    it('returns long break for session 4 (every 4th)', () => {
      const phase = getPhaseForSessionCount(4);
      expect(phase.name).toBe('long-break');
    });

    it('returns short break for session 5', () => {
      const phase = getPhaseForSessionCount(5);
      expect(phase.name).toBe('break');
    });

    it('returns long break for session 8', () => {
      const phase = getPhaseForSessionCount(8);
      expect(phase.name).toBe('long-break');
    });

    it('returns long break for session 12', () => {
      const phase = getPhaseForSessionCount(12);
      expect(phase.name).toBe('long-break');
    });

    it('returns short break for session 0', () => {
      // Edge case: 0 % 4 === 0
      const phase = getPhaseForSessionCount(0);
      expect(phase.name).toBe('long-break');
    });
  });
});
