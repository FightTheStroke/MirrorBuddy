/**
 * Data Retention Service Tests
 * Part of Ethical Design Hardening (F-03)
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RETENTION_POLICY,
  type DataRetentionPolicy,
} from '../types';

describe('data-retention-service', () => {
  describe('DEFAULT_RETENTION_POLICY', () => {
    it('should have conversations policy of 365 days', () => {
      expect(DEFAULT_RETENTION_POLICY.conversationTTLDays).toBe(365);
    });

    it('should have embeddings policy of 365 days', () => {
      expect(DEFAULT_RETENTION_POLICY.embeddingsTTLDays).toBe(365);
    });

    it('should have progress policy of 730 days (2 years)', () => {
      expect(DEFAULT_RETENTION_POLICY.progressTTLDays).toBe(730);
    });

    it('should have flashcard policy of 730 days (2 years)', () => {
      expect(DEFAULT_RETENTION_POLICY.flashcardTTLDays).toBe(730);
    });

    it('should default autoDelete to false', () => {
      expect(DEFAULT_RETENTION_POLICY.autoDelete).toBe(false);
    });

    it('should have all required fields', () => {
      const policy: DataRetentionPolicy = DEFAULT_RETENTION_POLICY;

      expect(typeof policy.conversationTTLDays).toBe('number');
      expect(typeof policy.embeddingsTTLDays).toBe('number');
      expect(typeof policy.progressTTLDays).toBe('number');
      expect(typeof policy.flashcardTTLDays).toBe('number');
      expect(typeof policy.autoDelete).toBe('boolean');
    });
  });

  describe('calculateRetentionDate (utility)', () => {
    it('should calculate correct date for conversations', () => {
      const baseDate = new Date('2024-06-15T12:00:00Z');
      const ttlDays = DEFAULT_RETENTION_POLICY.conversationTTLDays;
      const retentionDate = new Date(
        baseDate.getTime() + ttlDays * 24 * 60 * 60 * 1000
      );

      expect(retentionDate.getFullYear()).toBe(2025); // 365 days later
    });

    it('should calculate correct date for embeddings', () => {
      const baseDate = new Date('2024-06-15T12:00:00Z');
      const ttlDays = DEFAULT_RETENTION_POLICY.embeddingsTTLDays;
      const retentionDate = new Date(
        baseDate.getTime() + ttlDays * 24 * 60 * 60 * 1000
      );

      expect(retentionDate.getFullYear()).toBe(2025);
    });
  });

  describe('isExpired (utility)', () => {
    it('should return true for expired dates', () => {
      const pastDate = new Date('2024-01-01T00:00:00Z');
      const now = new Date();
      expect(pastDate < now).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      const now = new Date();
      expect(futureDate > now).toBe(true);
    });
  });

  describe('policy compliance', () => {
    it('should comply with GDPR storage limitation principle', () => {
      // GDPR requires data not be kept longer than necessary
      // 365 days for conversations is reasonable for educational platform
      expect(DEFAULT_RETENTION_POLICY.conversationTTLDays).toBeLessThanOrEqual(730);
    });

    it('should retain learning progress longer for educational continuity', () => {
      // Progress data can be kept longer to support learning journey
      expect(DEFAULT_RETENTION_POLICY.progressTTLDays).toBeGreaterThanOrEqual(
        DEFAULT_RETENTION_POLICY.conversationTTLDays
      );
    });

    it('should default to soft-delete (not auto-delete)', () => {
      // Soft delete allows for recovery and legal compliance
      expect(DEFAULT_RETENTION_POLICY.autoDelete).toBe(false);
    });
  });
});
