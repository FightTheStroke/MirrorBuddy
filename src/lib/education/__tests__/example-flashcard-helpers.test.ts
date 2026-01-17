/**
 * Tests for Flashcard Helper Functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatInterval, formatNextReview } from '../example-flashcard-helpers';
import type { FSRSCard } from '../fsrs';

describe('example-flashcard-helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatInterval', () => {
    const createCard = (hoursFromNow: number): FSRSCard => ({
      id: 'test-card',
      question: 'Test?',
      answer: 'Answer',
      stability: 1,
      difficulty: 0.3,
      interval: 1,
      nextReview: new Date(Date.now() + hoursFromNow * 60 * 60 * 1000),
      lastReview: null,
      repetitions: 0,
      lapses: 0,
      state: 'new',
    });

    it('returns "< 1h" for intervals less than 1 hour', () => {
      const card = createCard(0.5);
      expect(formatInterval(card)).toBe('< 1h');
    });

    it('returns hours for intervals less than 24 hours', () => {
      const card = createCard(5);
      expect(formatInterval(card)).toBe('5h');
    });

    it('returns days for intervals less than 30 days', () => {
      const card = createCard(48);
      expect(formatInterval(card)).toBe('2d');
    });

    it('returns months for intervals 30 days or more', () => {
      const card = createCard(24 * 60);
      expect(formatInterval(card)).toBe('2mo');
    });

    it('applies multiplier correctly', () => {
      const card = createCard(12);
      expect(formatInterval(card, 2)).toBe('1d');
    });

    it('handles edge case at exactly 1 hour', () => {
      const card = createCard(1);
      expect(formatInterval(card)).toBe('1h');
    });

    it('handles edge case at exactly 24 hours', () => {
      const card = createCard(24);
      expect(formatInterval(card)).toBe('1d');
    });
  });

  describe('formatNextReview', () => {
    it('returns hours for less than 1 day', () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 60 * 1000);
      expect(formatNextReview(futureDate)).toBe('In 5h');
    });

    it('returns days for less than 1 week', () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      expect(formatNextReview(futureDate)).toBe('In 3d');
    });

    it('returns weeks for less than 1 month', () => {
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      expect(formatNextReview(futureDate)).toBe('In 2w');
    });

    it('returns formatted date for 1 month or more', () => {
      const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const result = formatNextReview(futureDate);
      // Should be a locale date string
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
    });

    it('rounds hours correctly', () => {
      const futureDate = new Date(Date.now() + 2.7 * 60 * 60 * 1000);
      expect(formatNextReview(futureDate)).toBe('In 3h');
    });

    it('rounds days correctly', () => {
      const futureDate = new Date(Date.now() + 4.6 * 24 * 60 * 60 * 1000);
      expect(formatNextReview(futureDate)).toBe('In 5d');
    });
  });
});
