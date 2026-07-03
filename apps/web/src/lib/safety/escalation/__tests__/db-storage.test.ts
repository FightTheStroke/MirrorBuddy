// @vitest-environment node
/**
 * Escalation Durable Storage Tests (D-07)
 * Verifies escalation events persist full context to the SafetyEvent table
 * and can be read back after an instance recycle (buffers are cache only).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  storeEscalationEvent,
  getRecentEscalationsFromDb,
  getUnresolvedEscalationsFromDb,
  resolveEscalationInDb,
} from '../db-storage';
import type { EscalationEvent } from '../types';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';
const mockCreate = prisma.safetyEvent.create as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.safetyEvent.findMany as ReturnType<typeof vi.fn>;
const mockUpdateMany = prisma.safetyEvent.updateMany as ReturnType<typeof vi.fn>;

function makeEvent(overrides: Partial<EscalationEvent> = {}): EscalationEvent {
  return {
    id: 'esc_123_abc',
    trigger: 'crisis_detected',
    severity: 'critical',
    timestamp: new Date('2026-06-30T10:00:00.000Z'),
    sessionHash: 'hash_session_456',
    maestroId: 'galileo',
    metadata: { reason: 'Crisis keywords detected' },
    adminNotified: true,
    resolved: false,
    ...overrides,
  };
}

describe('Escalation Durable Storage (D-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('storeEscalationEvent', () => {
    it('persists full escalation context needed for durable readback', async () => {
      mockCreate.mockResolvedValue({});

      await storeEscalationEvent(makeEvent(), true);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const args = mockCreate.mock.calls[0][0];
      expect(args.data.type).toBe('escalation_crisis_detected');
      expect(args.data.severity).toBe('critical');
      expect(args.data.timestamp).toEqual(new Date('2026-06-30T10:00:00.000Z'));
      expect(args.data.sessionId).toBe('hash_session_456');
      expect(args.data.metadata).toEqual({
        escalationId: 'esc_123_abc',
        severity: 'critical',
        maestroId: 'galileo',
        adminNotified: true,
        reason: 'Crisis keywords detected',
      });
    });

    it('maps non-critical severity to alert', async () => {
      mockCreate.mockResolvedValue({});

      await storeEscalationEvent(
        makeEvent({ trigger: 'repeated_jailbreak', severity: 'high' }),
        true,
      );

      const args = mockCreate.mock.calls[0][0];
      expect(args.data.type).toBe('escalation_repeated_jailbreak');
      expect(args.data.severity).toBe('alert');
      expect(args.data.metadata.severity).toBe('high');
    });

    it('does not write when storeInDb is false', async () => {
      await storeEscalationEvent(makeEvent(), false);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('never throws on DB failure', async () => {
      mockCreate.mockRejectedValue(new Error('db down'));
      await expect(storeEscalationEvent(makeEvent(), true)).resolves.toBeUndefined();
    });
  });

  describe('getRecentEscalationsFromDb', () => {
    it('reads escalations back with original ids and context', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'db-row-1',
          type: 'escalation_crisis_detected',
          severity: 'critical',
          timestamp: new Date('2026-06-30T10:00:00.000Z'),
          sessionId: 'hash_session_456',
          resolvedAt: null,
          resolution: null,
          metadata: {
            escalationId: 'esc_123_abc',
            severity: 'critical',
            maestroId: 'galileo',
            adminNotified: true,
            reason: 'Crisis keywords detected',
          },
        },
      ]);

      const events = await getRecentEscalationsFromDb(1440);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('esc_123_abc');
      expect(events[0].trigger).toBe('crisis_detected');
      expect(events[0].severity).toBe('critical');
      expect(events[0].maestroId).toBe('galileo');
      expect(events[0].resolved).toBe(false);
      expect(events[0].adminNotified).toBe(true);
      expect(events[0].metadata.reason).toBe('Crisis keywords detected');

      // Parameterized, escalation-scoped, time-bounded query
      const args = mockFindMany.mock.calls[0][0];
      expect(args.where.type).toEqual({ startsWith: 'escalation_' });
      expect(args.where.timestamp.gte).toBeInstanceOf(Date);
      expect(args.orderBy).toEqual({ timestamp: 'desc' });
    });

    it('maps legacy rows without metadata to safe defaults', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'db-row-legacy',
          type: 'escalation_severe_content_filter',
          severity: 'alert',
          timestamp: new Date('2026-06-30T09:00:00.000Z'),
          sessionId: null,
          resolvedAt: new Date('2026-06-30T11:00:00.000Z'),
          resolution: 'Reviewed by admin',
          metadata: null,
        },
      ]);

      const events = await getRecentEscalationsFromDb(1440);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('db-row-legacy');
      expect(events[0].trigger).toBe('severe_content_filter');
      expect(events[0].severity).toBe('high');
      expect(events[0].resolved).toBe(true);
      expect(events[0].adminNotes).toBe('Reviewed by admin');
      expect(events[0].maestroId).toBeUndefined();
    });

    it('returns [] on empty DB and on error', async () => {
      mockFindMany.mockResolvedValue([]);
      expect(await getRecentEscalationsFromDb(60)).toEqual([]);

      mockFindMany.mockRejectedValue(new Error('db down'));
      expect(await getRecentEscalationsFromDb(60)).toEqual([]);
    });
  });

  describe('getUnresolvedEscalationsFromDb', () => {
    it('queries only unresolved escalation rows', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'db-row-2',
          type: 'escalation_repeated_jailbreak',
          severity: 'alert',
          timestamp: new Date('2026-06-30T08:00:00.000Z'),
          sessionId: null,
          resolvedAt: null,
          resolution: null,
          metadata: { escalationId: 'esc_456_def', severity: 'high' },
        },
      ]);

      const events = await getUnresolvedEscalationsFromDb();

      expect(events).toHaveLength(1);
      expect(events[0].resolved).toBe(false);
      expect(events[0].severity).toBe('high');

      const args = mockFindMany.mock.calls[0][0];
      expect(args.where).toEqual({
        type: { startsWith: 'escalation_' },
        resolvedAt: null,
      });
    });

    it('returns [] on error', async () => {
      mockFindMany.mockRejectedValue(new Error('db down'));
      expect(await getUnresolvedEscalationsFromDb()).toEqual([]);
    });
  });

  describe('resolveEscalationInDb', () => {
    it('persists resolution matching row id or original escalation id', async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });

      await resolveEscalationInDb('esc_123_abc', 'Handled');

      expect(mockUpdateMany).toHaveBeenCalledTimes(1);
      const args = mockUpdateMany.mock.calls[0][0];
      expect(args.where.type).toEqual({ startsWith: 'escalation_' });
      expect(args.where.OR).toEqual([
        { id: 'esc_123_abc' },
        { metadata: { path: ['escalationId'], equals: 'esc_123_abc' } },
      ]);
      expect(args.data.resolution).toBe('Handled');
      expect(args.data.resolvedAt).toBeInstanceOf(Date);
    });

    it('never throws on DB failure', async () => {
      mockUpdateMany.mockRejectedValue(new Error('db down'));
      await expect(resolveEscalationInDb('esc_123_abc')).resolves.toBeUndefined();
    });
  });
});
