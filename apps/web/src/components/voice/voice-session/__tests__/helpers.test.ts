/**
 * Tests for Voice Session Helpers
 */

import { describe, it, expect } from 'vitest';
import { formatTime } from '../helpers';

describe('voice-session-helpers', () => {
  describe('formatTime', () => {
    it('formats 0 seconds as 00:00', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    it('formats seconds under 60', () => {
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(59)).toBe('00:59');
    });

    it('formats 60 seconds as 01:00', () => {
      expect(formatTime(60)).toBe('01:00');
    });

    it('formats minutes and seconds', () => {
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(125)).toBe('02:05');
    });

    it('pads single digit seconds', () => {
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(301)).toBe('05:01');
    });

    it('pads single digit minutes', () => {
      expect(formatTime(300)).toBe('05:00');
      expect(formatTime(540)).toBe('09:00');
    });

    it('handles large values', () => {
      expect(formatTime(3600)).toBe('60:00'); // 1 hour
      expect(formatTime(3661)).toBe('61:01'); // 1 hour, 1 min, 1 sec
    });

    it('handles edge case at minute boundary', () => {
      expect(formatTime(119)).toBe('01:59');
      expect(formatTime(120)).toBe('02:00');
    });
  });
});
