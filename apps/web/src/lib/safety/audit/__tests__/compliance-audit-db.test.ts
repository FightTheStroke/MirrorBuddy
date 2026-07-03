// @vitest-environment node
/**
 * Compliance Audit Durable Storage Tests (D-07)
 * Verifies writes persist to the ComplianceAuditEntry table and reads
 * reconstruct entries from the database (source of truth for the admin
 * oversight dashboard).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  persistComplianceEntry,
  getComplianceEntriesFromDb,
  getComplianceStatisticsFromDb,
} from '../compliance-audit-db';
import type { ComplianceAuditEntry } from '../compliance-audit-types';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
const mockCreate = prisma.complianceAuditEntry.create as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.complianceAuditEntry.findMany as ReturnType<typeof vi.fn>;

function makeEntry(overrides: Partial<ComplianceAuditEntry> = {}): ComplianceAuditEntry {
  return {
    id: 'comp_audit_123_abc',
    timestamp: '2026-06-30T10:00:00.000Z',
    eventType: 'crisis_detected',
    severity: 'critical',
    regulatoryContext: { aiAct: true, gdpr: true, coppa: true, italianL132Art4: true },
    userContext: { sessionHash: 'sess_abc123', ageGroup: 'teen', region: 'EU' },
    eventDetails: { crisisType: 'self_harm' },
    mitigationApplied: 'escalated_to_human',
    outcome: 'escalated',
    maestroId: 'maestro-1',
    confidenceScore: 0.99,
    ...overrides,
  };
}

describe('Compliance Audit Durable Storage (D-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('persistComplianceEntry', () => {
    it('persists the entry with a parameterized create', async () => {
      mockCreate.mockResolvedValue({});

      await persistComplianceEntry(makeEntry());

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const args = mockCreate.mock.calls[0][0];
      expect(args.data.eventType).toBe('crisis_detected');
      expect(args.data.severity).toBe('critical');
      expect(args.data.userId).toBeNull();
      expect(args.data.createdAt).toEqual(new Date('2026-06-30T10:00:00.000Z'));

      const details = JSON.parse(args.data.details);
      expect(details.auditId).toBe('comp_audit_123_abc');
      expect(details.outcome).toBe('escalated');
      expect(details.userContext.ageGroup).toBe('teen');
      expect(details.regulatoryContext.coppa).toBe(true);
    });

    it('never throws on DB failure (logs instead)', async () => {
      mockCreate.mockRejectedValue(new Error('db down'));

      await expect(persistComplianceEntry(makeEntry())).resolves.toBeUndefined();
    });
  });

  describe('getComplianceEntriesFromDb', () => {
    it('round-trips entries written by the compliance service', async () => {
      const entry = makeEntry();
      mockFindMany.mockResolvedValue([
        {
          id: 'db-row-1',
          eventType: entry.eventType,
          severity: entry.severity,
          details: JSON.stringify({
            source: 'compliance-audit-service',
            auditId: entry.id,
            regulatoryContext: entry.regulatoryContext,
            userContext: entry.userContext,
            eventDetails: entry.eventDetails,
            mitigationApplied: entry.mitigationApplied,
            outcome: entry.outcome,
            maestroId: entry.maestroId,
            confidenceScore: entry.confidenceScore,
          }),
          createdAt: new Date(entry.timestamp),
        },
      ]);

      const entries = await getComplianceEntriesFromDb({ limit: 20 });

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('comp_audit_123_abc');
      expect(entries[0].eventType).toBe('crisis_detected');
      expect(entries[0].severity).toBe('critical');
      expect(entries[0].outcome).toBe('escalated');
      expect(entries[0].mitigationApplied).toBe('escalated_to_human');
      expect(entries[0].userContext.ageGroup).toBe('teen');
      expect(entries[0].maestroId).toBe('maestro-1');
      expect(entries[0].timestamp).toBe('2026-06-30T10:00:00.000Z');

      // Query is scoped to compliance event types and parameterized
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where.eventType.in).toContain('crisis_detected');
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
      expect(args.take).toBe(20);
    });

    it('falls back to safe defaults for rows written by other services', async () => {
      // audit-trail-service rows share the table but have a different details shape
      mockFindMany.mockResolvedValue([
        {
          id: 'db-row-2',
          eventType: 'content_filtered',
          severity: 'medium',
          details: JSON.stringify({
            auditId: 'audit_999_xyz',
            maestroId: 'maestro-2',
            metadata: { filterType: 'profanity' },
          }),
          createdAt: new Date('2026-06-29T09:00:00.000Z'),
        },
      ]);

      const entries = await getComplianceEntriesFromDb({});

      expect(entries).toHaveLength(1);
      expect(entries[0].eventType).toBe('content_filtered');
      expect(entries[0].userContext.ageGroup).toBe('unknown');
      expect(entries[0].outcome).toBe('monitored');
      expect(entries[0].mitigationApplied).toBe('none');
      expect(entries[0].eventDetails).toEqual({ filterType: 'profanity' });
      // Defaults derived from event type (content_filtered triggers COPPA)
      expect(entries[0].regulatoryContext.coppa).toBe(true);
    });

    it('handles malformed details JSON without throwing', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'db-row-3',
          eventType: 'jailbreak_attempt',
          severity: 'weird-value',
          details: 'not json {',
          createdAt: new Date('2026-06-29T09:00:00.000Z'),
        },
      ]);

      const entries = await getComplianceEntriesFromDb({});
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('db-row-3');
      expect(entries[0].severity).toBe('low');
      expect(entries[0].eventDetails).toEqual({});
    });

    it('returns [] when the DB is empty', async () => {
      mockFindMany.mockResolvedValue([]);
      const entries = await getComplianceEntriesFromDb({ limit: 20 });
      expect(entries).toEqual([]);
    });

    it('returns [] on DB error (dashboard degrades gracefully)', async () => {
      mockFindMany.mockRejectedValue(new Error('db down'));
      const entries = await getComplianceEntriesFromDb({ limit: 20 });
      expect(entries).toEqual([]);
    });
  });

  describe('getComplianceStatisticsFromDb', () => {
    it('computes statistics from durable rows', async () => {
      const now = new Date();
      mockFindMany.mockResolvedValue([
        {
          id: 'r1',
          eventType: 'crisis_detected',
          severity: 'critical',
          details: JSON.stringify({
            auditId: 'a1',
            regulatoryContext: { aiAct: true, gdpr: true, coppa: true, italianL132Art4: true },
            userContext: { sessionHash: 's1', ageGroup: 'teen' },
            outcome: 'escalated',
            mitigationApplied: 'escalated_to_human',
          }),
          createdAt: now,
        },
        {
          id: 'r2',
          eventType: 'content_filtered',
          severity: 'medium',
          details: JSON.stringify({
            auditId: 'a2',
            regulatoryContext: { aiAct: true, gdpr: true, coppa: true, italianL132Art4: true },
            userContext: { sessionHash: 's2', ageGroup: 'child' },
            outcome: 'blocked',
            mitigationApplied: 'content_blocked',
          }),
          createdAt: now,
        },
      ]);

      const stats = await getComplianceStatisticsFromDb(30);

      expect(stats.totalEvents).toBe(2);
      expect(stats.criticalEvents).toBe(1);
      expect(stats.eventsByType).toEqual({ crisis_detected: 1, content_filtered: 1 });
      expect(stats.eventsBySeverity).toEqual({ critical: 1, medium: 1 });
      expect(stats.regulatoryImpact.aiActEvents).toBe(2);
      expect(stats.mitigationMetrics.escalatedCount).toBe(1);
      expect(stats.mitigationMetrics.blockedCount).toBe(1);
      expect(stats.ageGroupDistribution).toEqual({ teen: 1, child: 1 });
    });

    it('returns zeroed statistics (never undefined) on empty DB and on error', async () => {
      mockFindMany.mockResolvedValue([]);
      const empty = await getComplianceStatisticsFromDb(30);
      expect(empty.totalEvents).toBe(0);
      expect(empty.eventsByType).toEqual({});
      expect(empty.trendDirection).toBe('stable');

      mockFindMany.mockRejectedValue(new Error('db down'));
      const onError = await getComplianceStatisticsFromDb(30);
      expect(onError.totalEvents).toBe(0);
      expect(onError.mitigationMetrics).toEqual({
        blockedCount: 0,
        modifiedCount: 0,
        escalatedCount: 0,
        allowedCount: 0,
        monitoredCount: 0,
      });
    });
  });
});
