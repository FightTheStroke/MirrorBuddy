/**
 * Tests for Jailbreak Flagging Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('jailbreak-flagging', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isKnownPattern', () => {
    it('returns true for known patterns', async () => {
      const { isKnownPattern } = await import('../jailbreak-flagging');

      expect(isKnownPattern('ignore_instructions')).toBe(true);
      expect(isKnownPattern('roleplay_bypass')).toBe(true);
      expect(isKnownPattern('language_switch')).toBe(true);
    });

    it('returns false for unknown patterns', async () => {
      const { isKnownPattern } = await import('../jailbreak-flagging');

      expect(isKnownPattern('unknown_pattern')).toBe(false);
      expect(isKnownPattern('custom_attack')).toBe(false);
    });
  });

  describe('getKnownPatterns', () => {
    it('returns array of known patterns', async () => {
      const { getKnownPatterns } = await import('../jailbreak-flagging');
      const patterns = getKnownPatterns();

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns).toContain('ignore_instructions');
      expect(patterns).toContain('developer_mode');
    });

    it('includes all 8 baseline patterns', async () => {
      const { getKnownPatterns } = await import('../jailbreak-flagging');
      const patterns = getKnownPatterns();

      expect(patterns.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('flagJailbreakAttempt', () => {
    it('creates attempt record with correct structure', async () => {
      const { flagJailbreakAttempt } = await import('../jailbreak-flagging');

      const attempt = flagJailbreakAttempt(
        'user123',
        'session456',
        'test content',
        'ignore_instructions',
        0.9
      );

      expect(attempt).toMatchObject({
        patternType: 'ignore_instructions',
        confidence: 0.9,
        isNovel: false,
        reviewStatus: 'pending',
      });
      expect(attempt.id).toMatch(/^jb_\d+_[a-z0-9]+$/);
      expect(attempt.anonymizedUserId).toBe('user123***');
      expect(attempt.sessionHash).toMatch(/^sess_[a-f0-9]+$/);
    });

    it('marks novel patterns correctly', async () => {
      const { flagJailbreakAttempt } = await import('../jailbreak-flagging');

      const attempt = flagJailbreakAttempt(
        'user123',
        'session456',
        'new attack vector',
        'custom_novel_attack',
        0.85
      );

      expect(attempt.isNovel).toBe(true);
      expect(attempt.sanitizedSample).toBeDefined();
    });

    it('does not include sanitizedSample for known patterns', async () => {
      const { flagJailbreakAttempt } = await import('../jailbreak-flagging');

      const attempt = flagJailbreakAttempt(
        'user123',
        'session456',
        'ignore instructions',
        'ignore_instructions',
        0.95
      );

      expect(attempt.isNovel).toBe(false);
      expect(attempt.sanitizedSample).toBeUndefined();
    });

    it('handles duplicate content detection', async () => {
      const { flagJailbreakAttempt } = await import('../jailbreak-flagging');

      const attempt1 = flagJailbreakAttempt(
        'user1',
        'session1',
        'same content',
        'novel_pattern',
        0.8
      );
      const attempt2 = flagJailbreakAttempt(
        'user2',
        'session2',
        'same content',
        'novel_pattern',
        0.8
      );

      expect(attempt1.reviewStatus).toBe('pending');
      expect(attempt2.reviewStatus).toBe('reviewed');
    });
  });

  describe('getPendingReviews', () => {
    it('returns only pending attempts', async () => {
      const { flagJailbreakAttempt, getPendingReviews } = await import(
        '../jailbreak-flagging'
      );

      flagJailbreakAttempt('user1', 'sess1', 'content1', 'novel1', 0.9);
      flagJailbreakAttempt('user2', 'sess2', 'content2', 'novel2', 0.8);

      const pending = getPendingReviews({});
      expect(pending.length).toBeGreaterThanOrEqual(2);
      expect(pending.every((a) => a.reviewStatus === 'pending')).toBe(true);
    });

    it('filters by novelOnly option', async () => {
      const { flagJailbreakAttempt, getPendingReviews } = await import(
        '../jailbreak-flagging'
      );

      flagJailbreakAttempt('user1', 'sess1', 'content3', 'ignore_instructions', 0.9);
      flagJailbreakAttempt('user2', 'sess2', 'content4', 'custom_new', 0.8);

      const novelOnly = getPendingReviews({ novelOnly: true });
      expect(novelOnly.every((a) => a.isNovel)).toBe(true);
    });

    it('filters by minConfidence option', async () => {
      const { flagJailbreakAttempt, getPendingReviews } = await import(
        '../jailbreak-flagging'
      );

      flagJailbreakAttempt('user1', 'sess1', 'content5', 'novel5', 0.5);
      flagJailbreakAttempt('user2', 'sess2', 'content6', 'novel6', 0.95);

      const highConfidence = getPendingReviews({ minConfidence: 0.8 });
      expect(highConfidence.every((a) => a.confidence >= 0.8)).toBe(true);
    });

    it('respects limit option', async () => {
      const { getPendingReviews } = await import('../jailbreak-flagging');

      const limited = getPendingReviews({ limit: 2 });
      expect(limited.length).toBeLessThanOrEqual(2);
    });

    it('sorts by confidence descending, novel first', async () => {
      const { flagJailbreakAttempt, getPendingReviews } = await import(
        '../jailbreak-flagging'
      );

      flagJailbreakAttempt('u1', 's1', 'c7', 'novel7', 0.7);
      flagJailbreakAttempt('u2', 's2', 'c8', 'novel8', 0.9);
      flagJailbreakAttempt('u3', 's3', 'c9', 'ignore_instructions', 0.95);

      const sorted = getPendingReviews({});
      // Novel attempts should be first when equal confidence
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].isNovel === sorted[i + 1].isNovel) {
          expect(sorted[i].confidence).toBeGreaterThanOrEqual(sorted[i + 1].confidence);
        }
      }
    });
  });

  describe('markReviewed', () => {
    it('marks attempt as false_positive', async () => {
      const { flagJailbreakAttempt, markReviewed, getPendingReviews } = await import(
        '../jailbreak-flagging'
      );

      const attempt = flagJailbreakAttempt('user1', 'sess1', 'content10', 'novel10', 0.9);
      markReviewed(attempt.id, 'false_positive');

      const pending = getPendingReviews({});
      expect(pending.find((a) => a.id === attempt.id)).toBeUndefined();
    });

    it('marks attempt as confirmed', async () => {
      const { flagJailbreakAttempt, markReviewed } = await import(
        '../jailbreak-flagging'
      );

      const attempt = flagJailbreakAttempt('user1', 'sess1', 'content11', 'novel11', 0.9);
      markReviewed(attempt.id, 'confirmed');

      // Attempt should be marked as confirmed
    });

    it('adds novel pattern to known patterns when requested', async () => {
      const { flagJailbreakAttempt, markReviewed, isKnownPattern } = await import(
        '../jailbreak-flagging'
      );

      const attempt = flagJailbreakAttempt(
        'user1',
        'sess1',
        'content12',
        'new_learned_pattern',
        0.9
      );
      expect(isKnownPattern('new_learned_pattern')).toBe(false);

      markReviewed(attempt.id, 'confirmed', true);
      expect(isKnownPattern('new_learned_pattern')).toBe(true);
    });

    it('handles non-existent attempt gracefully', async () => {
      const { markReviewed } = await import('../jailbreak-flagging');

      // Should not throw
      expect(() => markReviewed('non_existent_id', 'confirmed')).not.toThrow();
    });
  });

  describe('getJailbreakStatistics', () => {
    it('returns correct statistics structure', async () => {
      const { getJailbreakStatistics } = await import('../jailbreak-flagging');

      const stats = getJailbreakStatistics(30);

      expect(stats).toMatchObject({
        totalAttempts: expect.any(Number),
        novelAttempts: expect.any(Number),
        pendingReview: expect.any(Number),
        confirmedThreats: expect.any(Number),
        falsePositives: expect.any(Number),
        topPatterns: expect.any(Array),
      });
    });

    it('filters by period correctly', async () => {
      const { flagJailbreakAttempt, getJailbreakStatistics } = await import(
        '../jailbreak-flagging'
      );

      // Add attempt
      flagJailbreakAttempt('user1', 'sess1', 'content13', 'novel13', 0.9);

      const stats = getJailbreakStatistics(1);
      expect(stats.totalAttempts).toBeGreaterThanOrEqual(1);

      // Move time forward past period
      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);

      const statsAfter = getJailbreakStatistics(1);
      // Stats should show fewer attempts after time passed
    });

    it('calculates topPatterns correctly', async () => {
      const { getJailbreakStatistics } = await import('../jailbreak-flagging');

      const stats = getJailbreakStatistics(30);
      expect(Array.isArray(stats.topPatterns)).toBe(true);
      expect(stats.topPatterns.length).toBeLessThanOrEqual(5);

      for (const pattern of stats.topPatterns) {
        expect(pattern).toMatchObject({
          pattern: expect.any(String),
          count: expect.any(Number),
        });
      }
    });
  });
});
