/**
 * Tests for Parent Dashboard Safety Events API
 * F-05, F-07: Parent notification for crisis events
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';

// Mock middlewares
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._fns: any[]) =>
    (handler: any) =>
      handler,
  withSentry: vi.fn((_path: string) => (ctx: any, next: any) => next(ctx)),
  withCSRF: vi.fn((ctx: any, next: any) => next(ctx)),
  withAuth: vi.fn((ctx: any, next: any) => next(ctx)),
}));

// Mock Prisma
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

// Import mocked prisma
import { prisma } from '@/lib/db';
const mockFindMany = prisma.safetyEvent.findMany as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.safetyEvent.update as ReturnType<typeof vi.fn>;

describe('Parent Dashboard Safety Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/parent-dashboard/safety-events', () => {
    it('returns crisis events with severity labels', async () => {
      const mockEvents = [
        {
          id: 'event1',
          severity: 'critical',
          type: 'crisis_self_harm_detected',
          timestamp: new Date('2026-02-15T10:00:00Z'),
          metadata: { reason: 'detected keywords' },
          parentNotified: false,
          parentNotifiedAt: null,
        },
        {
          id: 'event2',
          severity: 'alert',
          type: 'crisis_distress_detected',
          timestamp: new Date('2026-02-14T15:30:00Z'),
          metadata: null,
          parentNotified: true,
          parentNotifiedAt: new Date('2026-02-14T16:00:00Z'),
        },
      ];

      mockFindMany.mockResolvedValue(mockEvents);

      const ctx = {
        userId: 'user123',
        request: new Request('http://localhost/api/parent-dashboard/safety-events'),
      };

      const response = await GET(ctx as any);
      const data = await response.json();

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user123', category: 'crisis' },
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          severity: true,
          type: true,
          timestamp: true,
          metadata: true,
          parentNotified: true,
          parentNotifiedAt: true,
        },
      });

      expect(data.events).toHaveLength(2);
      expect(data.unreadCount).toBe(1);

      // Check first event
      expect(data.events[0].id).toBe('event1');
      expect(data.events[0].severityLabel).toBe('Critical');
      expect(data.events[0].severityColor).toBe('red');
      expect(data.events[0].description).toBe('Crisis support triggered - self-harm indicators');
      expect(data.events[0].viewed).toBe(false);
      expect(data.events[0].helplineNumbers).toHaveLength(2);
      expect(data.events[0].recommendedActions).toHaveLength(4);

      // Check second event
      expect(data.events[1].id).toBe('event2');
      expect(data.events[1].severityLabel).toBe('Alert');
      expect(data.events[1].severityColor).toBe('orange');
      expect(data.events[1].viewed).toBe(true);
      expect(data.events[1].viewedAt).toBeTruthy();
    });

    it('filters by category="crisis"', async () => {
      mockFindMany.mockResolvedValue([]);

      const ctx = {
        userId: 'user123',
        request: new Request('http://localhost/api/parent-dashboard/safety-events'),
      };

      await GET(ctx as any);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user123', category: 'crisis' },
        }),
      );
    });

    it('returns empty array when no events', async () => {
      mockFindMany.mockResolvedValue([]);

      const ctx = {
        userId: 'user123',
        request: new Request('http://localhost/api/parent-dashboard/safety-events'),
      };

      const response = await GET(ctx as any);
      const data = await response.json();

      expect(data.events).toEqual([]);
      expect(data.unreadCount).toBe(0);
    });

    it('handles unknown event types with default description', async () => {
      const mockEvents = [
        {
          id: 'event1',
          severity: 'warning',
          type: 'unknown_crisis_type',
          timestamp: new Date('2026-02-15T10:00:00Z'),
          metadata: null,
          parentNotified: false,
          parentNotifiedAt: null,
        },
      ];

      mockFindMany.mockResolvedValue(mockEvents);

      const ctx = {
        userId: 'user123',
        request: new Request('http://localhost/api/parent-dashboard/safety-events'),
      };

      const response = await GET(ctx as any);
      const data = await response.json();

      expect(data.events[0].description).toBe('Safety protocol activated for student wellbeing');
      expect(data.events[0].severityLabel).toBe('Warning');
      expect(data.events[0].severityColor).toBe('yellow');
    });
  });

  describe('POST /api/parent-dashboard/safety-events', () => {
    it('marks event as viewed', async () => {
      mockUpdate.mockResolvedValue({
        id: 'event1',
        parentNotified: true,
        parentNotifiedAt: new Date(),
      });

      const ctx = {
        userId: 'user123',
        request: new Request('http://localhost/api/parent-dashboard/safety-events', {
          method: 'POST',
          body: JSON.stringify({ eventId: 'event1' }),
        }),
      };

      const response = await POST(ctx as any);
      const data = await response.json();

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'event1', userId: 'user123' },
        data: {
          parentNotified: true,
          parentNotifiedAt: expect.any(Date),
        },
      });

      expect(data.success).toBe(true);
    });

    it('returns 400 when eventId is missing', async () => {
      const ctx = {
        userId: 'user123',
        request: new Request('http://localhost/api/parent-dashboard/safety-events', {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      };

      const response = await POST(ctx as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('eventId required');
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
