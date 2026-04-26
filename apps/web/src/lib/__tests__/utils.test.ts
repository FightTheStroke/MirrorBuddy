/**
 * Tests for main utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, formatTime, formatDate, calculateLevel, xpToNextLevel, debounce } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('merges Tailwind classes correctly', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('handles arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('handles objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('handles empty input', () => {
      expect(cn()).toBe('');
    });

    it('handles undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });
  });

  describe('formatTime', () => {
    it('formats 0 seconds', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('formats seconds less than a minute', () => {
      expect(formatTime(45)).toBe('0:45');
    });

    it('formats exactly one minute', () => {
      expect(formatTime(60)).toBe('1:00');
    });

    it('formats minutes and seconds', () => {
      expect(formatTime(125)).toBe('2:05');
    });

    it('formats with padding for single digit seconds', () => {
      expect(formatTime(63)).toBe('1:03');
    });

    it('formats large values', () => {
      expect(formatTime(3661)).toBe('61:01');
    });
  });

  describe('formatDate', () => {
    it('formats date in Italian locale', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('formats different month', () => {
      const date = new Date('2024-06-20');
      const result = formatDate(date);
      expect(result).toContain('20');
      expect(result).toContain('2024');
    });
  });

  describe('calculateLevel', () => {
    it('returns level 1 for 0 xp', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('returns level 1 for 99 xp', () => {
      expect(calculateLevel(99)).toBe(1);
    });

    it('returns level 2 for 100 xp', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it('returns level 3 for 250 xp', () => {
      expect(calculateLevel(250)).toBe(3);
    });

    it('returns level 5 for 1000 xp', () => {
      expect(calculateLevel(1000)).toBe(5);
    });

    it('returns level 11 for max threshold', () => {
      expect(calculateLevel(64000)).toBe(11);
    });

    it('caps at level 11 for very high xp', () => {
      expect(calculateLevel(100000)).toBe(11);
    });

    it('handles negative xp', () => {
      expect(calculateLevel(-100)).toBe(1);
    });
  });

  describe('xpToNextLevel', () => {
    it('returns 100 for 0 xp (level 1)', () => {
      expect(xpToNextLevel(0)).toBe(100);
    });

    it('returns 50 for 50 xp', () => {
      expect(xpToNextLevel(50)).toBe(50);
    });

    it('returns 150 for 100 xp (level 2)', () => {
      expect(xpToNextLevel(100)).toBe(150);
    });

    it('returns 0 for max level', () => {
      expect(xpToNextLevel(64000)).toBe(0);
    });

    it('returns 0 for above max threshold', () => {
      expect(xpToNextLevel(100000)).toBe(0);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays function execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('cancels previous calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('passes arguments to function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('uses latest arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      vi.advanceTimersByTime(50);
      debounced('second');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('second');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
