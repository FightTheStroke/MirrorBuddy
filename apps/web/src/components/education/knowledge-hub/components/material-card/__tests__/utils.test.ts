/**
 * Tests for Material Card Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDate } from '../utils';

describe('material-card-utils', () => {
  describe('formatDate', () => {
    beforeEach(() => {
      // Fix time to 2024-01-15 10:00:00
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Oggi" for today\'s date', () => {
      const today = new Date('2024-01-15T08:00:00');
      expect(formatDate(today)).toBe('Oggi');
    });

    it('returns "Ieri" for 24-48 hours ago', () => {
      // Function uses time difference, not calendar days
      const yesterday = new Date('2024-01-14T09:00:00'); // 25 hours ago
      expect(formatDate(yesterday)).toBe('Ieri');
    });

    it('returns days ago for 2-6 days ago', () => {
      const twoDaysAgo = new Date('2024-01-13T10:00:00');
      expect(formatDate(twoDaysAgo)).toBe('2 giorni fa');

      const sixDaysAgo = new Date('2024-01-09T10:00:00');
      expect(formatDate(sixDaysAgo)).toBe('6 giorni fa');
    });

    it('returns formatted date for 7+ days ago (same year)', () => {
      const weekAgo = new Date('2024-01-08T10:00:00');
      const result = formatDate(weekAgo);
      // Should contain day and month, not "giorni fa"
      expect(result).not.toContain('giorni fa');
      expect(result).toContain('8');
      expect(result).toContain('gen'); // January in Italian short
    });

    it('returns formatted date with year for different year', () => {
      const lastYear = new Date('2023-12-25T10:00:00');
      const result = formatDate(lastYear);
      // Should include the year
      expect(result).toContain('2023');
    });

    it('handles time-based difference (not calendar days)', () => {
      // Less than 24 hours ago is still "Oggi"
      const justBeforeMidnight = new Date('2024-01-14T23:59:59');
      expect(formatDate(justBeforeMidnight)).toBe('Oggi');
    });

    it('handles dates from earlier this year', () => {
      const january1st = new Date('2024-01-01T10:00:00');
      const result = formatDate(january1st);
      // 14 days ago, should be formatted date
      expect(result).not.toContain('giorni fa');
      expect(result).toContain('1');
    });
  });
});
