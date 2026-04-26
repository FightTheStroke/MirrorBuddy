/**
 * Tests for Safety Monitoring Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEventId, anonymizeId, isViolationType } from '../utils';

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn();
vi.stubGlobal('crypto', { randomUUID: mockRandomUUID });

describe('safety-monitoring utils', () => {
  beforeEach(() => {
    mockRandomUUID.mockReturnValue('12345678-1234-1234-1234-123456789abc');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  describe('generateEventId', () => {
    it('generates ID with se_ prefix', () => {
      const id = generateEventId();
      expect(id).toMatch(/^se_\d+_[a-f0-9]{8}$/);
    });

    it('includes timestamp in ID', () => {
      const id = generateEventId();
      const timestamp = Date.now().toString();
      expect(id).toContain(timestamp);
    });

    it('includes UUID prefix in ID', () => {
      const id = generateEventId();
      expect(id).toContain('12345678');
    });

    it('generates unique IDs with different timestamps', () => {
      const id1 = generateEventId();
      vi.advanceTimersByTime(1);
      mockRandomUUID.mockReturnValue('87654321-4321-4321-4321-cba987654321');
      const id2 = generateEventId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('anonymizeId', () => {
    it('anonymizes long IDs correctly', () => {
      const result = anonymizeId('user123456789');
      expect(result).toBe('user...6789');
    });

    it('returns *** for short IDs (8 or fewer chars)', () => {
      expect(anonymizeId('short')).toBe('***');
      expect(anonymizeId('12345678')).toBe('***');
    });

    it('returns *** for empty string', () => {
      expect(anonymizeId('')).toBe('***');
    });

    it('preserves first 4 and last 4 chars for valid IDs', () => {
      const result = anonymizeId('abcdefghijkl');
      expect(result.startsWith('abcd')).toBe(true);
      expect(result.endsWith('ijkl')).toBe(true);
      expect(result).toContain('...');
    });

    it('handles 9-character IDs (minimum for non-masking)', () => {
      const result = anonymizeId('123456789');
      expect(result).toBe('1234...6789');
    });
  });

  describe('isViolationType', () => {
    it('returns true for input_blocked', () => {
      expect(isViolationType('input_blocked')).toBe(true);
    });

    it('returns true for jailbreak_attempt', () => {
      expect(isViolationType('jailbreak_attempt')).toBe(true);
    });

    it('returns true for profanity_detected', () => {
      expect(isViolationType('profanity_detected')).toBe(true);
    });

    it('returns false for unknown violation types', () => {
      expect(isViolationType('unknown_type')).toBe(false);
      expect(isViolationType('other_event')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isViolationType('')).toBe(false);
    });

    it('returns false for similar but not exact matches', () => {
      expect(isViolationType('INPUT_BLOCKED')).toBe(false);
      expect(isViolationType('input-blocked')).toBe(false);
    });
  });
});
