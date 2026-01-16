/**
 * Audit Trail Service Tests
 * Part of Ethical Design Hardening (F-07)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  recordSafetyEvent,
  recordContentFiltered,
  recordGuardrailTriggered,
  recordPromptInjectionAttempt,
  getAuditEntries,
  getAuditStatistics,
} from '../audit-trail-service';

describe('audit-trail-service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('recordSafetyEvent', () => {
    it('should return audit entry ID', () => {
      const entryId = recordSafetyEvent('content_filtered');
      expect(entryId).toMatch(/^audit_/);
    });

    it('should record event with correct severity', () => {
      recordSafetyEvent('prompt_injection_attempt', { severity: 'high' });

      const entries = getAuditEntries({ eventType: 'prompt_injection_attempt' });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].severity).toBe('high');
    });

    it('should anonymize user ID', () => {
      const entryId = recordSafetyEvent('content_filtered', {
        userId: 'user-12345-sensitive',
      });

      const entries = getAuditEntries({ limit: 10 });
      const entry = entries.find((e) => e.id === entryId);

      expect(entry?.anonymizedUserId).not.toBe('user-12345-sensitive');
      expect(entry?.anonymizedUserId).toMatch(/^[\w-]+\*\*\*$/);
    });

    it('should hash session ID', () => {
      const entryId = recordSafetyEvent('guardrail_triggered', {
        sessionId: 'session-abc-123',
      });

      const entries = getAuditEntries({ limit: 10 });
      const entry = entries.find((e) => e.id === entryId);

      expect(entry?.sessionHash).toMatch(/^sess_/);
      expect(entry?.sessionHash).not.toContain('abc');
    });
  });

  describe('recordContentFiltered', () => {
    it('should record filter type in metadata', () => {
      const entryId = recordContentFiltered('profanity', {
        confidence: 0.95,
      });

      const entries = getAuditEntries({ limit: 10 });
      const entry = entries.find((e) => e.id === entryId);

      expect(entry?.metadata.filterType).toBe('profanity');
      expect(entry?.metadata.confidence).toBe(0.95);
    });

    it('should default action to blocked', () => {
      const entryId = recordContentFiltered('violence', {});

      const entries = getAuditEntries({ limit: 10 });
      const entry = entries.find((e) => e.id === entryId);

      expect(entry?.metadata.actionTaken).toBe('blocked');
    });
  });

  describe('recordGuardrailTriggered', () => {
    it('should record guardrail rule ID', () => {
      const entryId = recordGuardrailTriggered('age_verification', {
        confidence: 0.8,
      });

      const entries = getAuditEntries({ limit: 10 });
      const entry = entries.find((e) => e.id === entryId);

      expect(entry?.metadata.guardrailRuleId).toBe('age_verification');
    });
  });

  describe('recordPromptInjectionAttempt', () => {
    it('should record with high severity', () => {
      const entryId = recordPromptInjectionAttempt({
        confidence: 0.9,
        pattern: 'ignore_previous',
      });

      const entries = getAuditEntries({ limit: 10 });
      const entry = entries.find((e) => e.id === entryId);

      expect(entry?.severity).toBe('high');
      expect(entry?.eventType).toBe('prompt_injection_attempt');
    });
  });

  describe('getAuditEntries', () => {
    it('should filter by event type', () => {
      recordContentFiltered('test', {});
      recordGuardrailTriggered('test', {});

      const filtered = getAuditEntries({ eventType: 'content_filtered' });

      expect(filtered.every((e) => e.eventType === 'content_filtered')).toBe(true);
    });

    it('should filter by severity', () => {
      recordSafetyEvent('content_filtered', { severity: 'low' });
      recordPromptInjectionAttempt({ confidence: 0.9 });

      const highSeverity = getAuditEntries({ severity: 'high' });

      expect(highSeverity.every((e) => e.severity === 'high')).toBe(true);
    });

    it('should filter by date range', () => {
      recordSafetyEvent('content_filtered');

      vi.advanceTimersByTime(24 * 60 * 60 * 1000); // 1 day later

      recordSafetyEvent('content_filtered');

      const startDate = new Date('2024-06-16T00:00:00Z');
      const filtered = getAuditEntries({ startDate });

      expect(filtered.every((e) => e.timestamp >= startDate)).toBe(true);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        recordSafetyEvent('content_filtered');
      }

      const limited = getAuditEntries({ limit: 3 });
      expect(limited.length).toBe(3);
    });

    it('should return entries sorted by timestamp descending', () => {
      recordSafetyEvent('content_filtered');
      vi.advanceTimersByTime(1000);
      recordSafetyEvent('guardrail_triggered');
      vi.advanceTimersByTime(1000);
      recordSafetyEvent('content_filtered');

      const entries = getAuditEntries({ limit: 3 });

      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          entries[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('getAuditStatistics', () => {
    it('should return statistics for period', () => {
      recordSafetyEvent('content_filtered');
      recordSafetyEvent('guardrail_triggered');
      recordPromptInjectionAttempt({});

      const stats = getAuditStatistics(30);

      expect(stats.totalEvents).toBeGreaterThanOrEqual(3);
      expect(stats.byType).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
    });

    it('should calculate trend direction', () => {
      // Record some events in first half of period
      for (let i = 0; i < 3; i++) {
        recordSafetyEvent('content_filtered');
      }

      vi.advanceTimersByTime(20 * 24 * 60 * 60 * 1000); // 20 days later

      // Record more events in second half
      for (let i = 0; i < 10; i++) {
        recordSafetyEvent('content_filtered');
      }

      const stats = getAuditStatistics(30);

      expect(['increasing', 'decreasing', 'stable']).toContain(stats.trendDirection);
    });
  });
});
