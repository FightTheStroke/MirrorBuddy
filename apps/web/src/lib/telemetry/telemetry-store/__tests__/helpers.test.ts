/**
 * Tests for Telemetry Store Helpers
 */

import { describe, it, expect } from 'vitest';
import { generateSessionId, isSameDay } from '../helpers';

describe('telemetry-store-helpers', () => {
  describe('generateSessionId', () => {
    it('generates unique IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });

    it('starts with sess_ prefix', () => {
      const id = generateSessionId();
      expect(id.startsWith('sess_')).toBe(true);
    });

    it('contains timestamp', () => {
      const before = Date.now();
      const id = generateSessionId();
      const after = Date.now();

      // Format: sess_{timestamp}_{nanoid}
      const parts = id.split('_');
      expect(parts.length).toBeGreaterThanOrEqual(3);
      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('has expected format pattern', () => {
      const id = generateSessionId();
      // Format: sess_{timestamp}_{7-char-nanoid}
      const pattern = /^sess_\d+_[\w-]{7}$/;
      expect(id).toMatch(pattern);
    });
  });

  describe('isSameDay', () => {
    it('returns true for same day', () => {
      const date1 = new Date('2024-01-15T10:30:00');
      const date2 = new Date('2024-01-15T18:45:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('returns false for different days', () => {
      const date1 = new Date('2024-01-15T10:30:00');
      const date2 = new Date('2024-01-16T10:30:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for different months', () => {
      const date1 = new Date('2024-01-15T10:30:00');
      const date2 = new Date('2024-02-15T10:30:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for different years', () => {
      const date1 = new Date('2023-01-15T10:30:00');
      const date2 = new Date('2024-01-15T10:30:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for null', () => {
      const date2 = new Date('2024-01-15T10:30:00');
      expect(isSameDay(null, date2)).toBe(false);
    });

    it('handles string dates', () => {
      const date1 = '2024-01-15T10:30:00Z';
      const date2 = new Date('2024-01-15T18:45:00Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('handles ISO string dates', () => {
      const date1 = '2024-01-15T10:30:00.000Z';
      const date2 = new Date('2024-01-15T18:45:00.000Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('returns false for invalid string date', () => {
      const date2 = new Date('2024-01-15T10:30:00');
      expect(isSameDay('invalid-date', date2)).toBe(false);
    });

    it('handles midnight edge case', () => {
      const date1 = new Date('2024-01-15T00:00:00');
      const date2 = new Date('2024-01-15T23:59:59');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('handles year boundaries', () => {
      const date1 = new Date('2023-12-31T23:59:59');
      const date2 = new Date('2024-01-01T00:00:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });
});
