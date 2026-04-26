/**
 * Tests for Admin Safety Dashboard API
 * F-15 - Real-time AI system health and safety event data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock middlewares
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._fns: any[]) =>
    (handler: any) =>
      handler,
  withSentry: vi.fn((_path: string) => (ctx: any, next: any) => next(ctx)),
  withAdminReadOnly: vi.fn((ctx: any, next: any) => next(ctx)),
}));

// Mock safety server functions
vi.mock('@/lib/safety/server', () => ({
  getComplianceStatistics: vi.fn(),
  getComplianceEntries: vi.fn(),
  getRecentEscalations: vi.fn(),
  getUnresolvedEscalations: vi.fn(),
}));

import * as safetyServer from '@/lib/safety/server';
const mockGetComplianceStatistics = safetyServer.getComplianceStatistics as ReturnType<
  typeof vi.fn
>;
const mockGetComplianceEntries = safetyServer.getComplianceEntries as ReturnType<typeof vi.fn>;
const mockGetRecentEscalations = safetyServer.getRecentEscalations as ReturnType<typeof vi.fn>;
const mockGetUnresolvedEscalations = safetyServer.getUnresolvedEscalations as ReturnType<
  typeof vi.fn
>;

// Mock Prisma
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

// Import mocked prisma
import { prisma } from '@/lib/db';
const mockFindMany = prisma.safetyEvent.findMany as ReturnType<typeof vi.fn>;

describe('Admin Safety Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/safety', () => {
    it('returns DB-backed safety events', async () => {
      const mockStatistics = {
        totalEvents: 50,
        criticalEvents: 5,
        trendDirection: 'stable' as const,
        periodStart: '2026-01-16T00:00:00Z',
        periodEnd: '2026-02-16T00:00:00Z',
        eventsByType: { crisis: 10, filter: 20 },
        eventsBySeverity: { critical: 5, high: 10, medium: 15, low: 20 },
        eventsByOutcome: { blocked: 10, modified: 15, allowed: 25 },
        regulatoryImpact: {
          aiActEvents: 10,
          gdprEvents: 5,
          coppaEvents: 3,
          italianL132Art4Events: 2,
        },
        mitigationMetrics: {
          blockedCount: 10,
          modifiedCount: 15,
          escalatedCount: 5,
          allowedCount: 20,
          monitoredCount: 5,
        },
      };

      const mockComplianceEntries = [
        {
          id: 'entry1',
          timestamp: '2026-02-15T10:00:00Z',
          eventType: 'crisis_detected',
          severity: 'critical' as const,
          outcome: 'escalated',
          maestroId: 'maestro1',
          userContext: { ageGroup: '14-18' },
        },
      ];

      const mockDbEvents = [
        {
          id: 'db1',
          userId: 'user1',
          type: 'crisis_detected',
          severity: 'critical',
          conversationId: 'conv1',
          sessionId: 'sess1',
          timestamp: new Date('2026-02-15T10:00:00Z'),
          category: 'crisis',
          contentSnippet: 'snippet',
          locale: 'it',
          metadata: {},
          parentNotified: false,
          parentNotifiedAt: null,
          resolvedBy: null,
          resolvedAt: null,
          resolution: null,
        },
      ];

      const mockEscalations = [
        {
          id: 'esc1',
          trigger: 'crisis_keyword',
          severity: 'critical',
          timestamp: new Date('2026-02-15T10:00:00Z'),
          maestroId: 'maestro1',
          resolved: false,
        },
      ];

      mockGetComplianceStatistics.mockReturnValue(mockStatistics);
      mockGetComplianceEntries.mockReturnValue(mockComplianceEntries);
      mockFindMany.mockResolvedValue(mockDbEvents);
      mockGetRecentEscalations.mockReturnValue(mockEscalations);
      mockGetUnresolvedEscalations.mockReturnValue([mockEscalations[0]]);

      const response = await GET(new Request('http://localhost/api/admin/safety') as any);
      const data = await response.json();

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: expect.any(Date),
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 20,
      });

      expect(data.overview).toEqual({
        totalEvents: 50,
        criticalCount: 5,
        unresolvedEscalations: 1,
        trendDirection: 'stable',
        periodStart: '2026-01-16T00:00:00Z',
        periodEnd: '2026-02-16T00:00:00Z',
      });

      expect(data.recentEvents).toHaveLength(1);
      expect(data.recentEvents[0].userId).toBe('user1');
      expect(data.recentEvents[0].sessionId).toBe('conv1');

      expect(data.escalations).toHaveLength(1);
      expect(data.statistics.eventsByType).toEqual({ crisis: 10, filter: 20 });
    });

    it('filters by severity', async () => {
      const mockStatistics = {
        totalEvents: 10,
        criticalEvents: 3,
        trendDirection: 'increasing' as const,
        periodStart: '2026-01-16T00:00:00Z',
        periodEnd: '2026-02-16T00:00:00Z',
        eventsByType: {},
        eventsBySeverity: { critical: 3, high: 4, medium: 2, low: 1 },
        eventsByOutcome: {},
        regulatoryImpact: {
          aiActEvents: 0,
          gdprEvents: 0,
          coppaEvents: 0,
          italianL132Art4Events: 0,
        },
        mitigationMetrics: {
          blockedCount: 0,
          modifiedCount: 0,
          escalatedCount: 0,
          allowedCount: 0,
          monitoredCount: 0,
        },
      };

      mockGetComplianceStatistics.mockReturnValue(mockStatistics);
      mockGetComplianceEntries.mockReturnValue([]);
      mockFindMany.mockResolvedValue([]);
      mockGetRecentEscalations.mockReturnValue([]);
      mockGetUnresolvedEscalations.mockReturnValue([]);

      const response = await GET(new Request('http://localhost/api/admin/safety') as any);
      const data = await response.json();

      expect(data.statistics.eventsBySeverity).toEqual({
        critical: 3,
        high: 4,
        medium: 2,
        low: 1,
      });
    });

    it('handles empty safety events gracefully', async () => {
      const mockStatistics = {
        totalEvents: 0,
        criticalEvents: 0,
        trendDirection: 'stable' as const,
        periodStart: '2026-01-16T00:00:00Z',
        periodEnd: '2026-02-16T00:00:00Z',
        eventsByType: {},
        eventsBySeverity: {},
        eventsByOutcome: {},
        regulatoryImpact: {
          aiActEvents: 0,
          gdprEvents: 0,
          coppaEvents: 0,
          italianL132Art4Events: 0,
        },
        mitigationMetrics: {
          blockedCount: 0,
          modifiedCount: 0,
          escalatedCount: 0,
          allowedCount: 0,
          monitoredCount: 0,
        },
      };

      mockGetComplianceStatistics.mockReturnValue(mockStatistics);
      mockGetComplianceEntries.mockReturnValue([]);
      mockFindMany.mockResolvedValue([]);
      mockGetRecentEscalations.mockReturnValue([]);
      mockGetUnresolvedEscalations.mockReturnValue([]);

      const response = await GET(new Request('http://localhost/api/admin/safety') as any);
      const data = await response.json();

      expect(data.overview.totalEvents).toBe(0);
      expect(data.overview.criticalCount).toBe(0);
      expect(data.recentEvents).toEqual([]);
      expect(data.escalations).toEqual([]);
    });
  });
});
