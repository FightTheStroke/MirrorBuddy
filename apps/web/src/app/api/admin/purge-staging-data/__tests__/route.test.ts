/**
 * @jest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAdminAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    }),
    validateAdminReadOnlyAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      canAccessAdminReadOnly: true,
      userId: 'admin-1',
    }),
  };
});

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security')>();
  return {
    ...actual,
    requireCSRF: vi.fn().mockReturnValue(true),
  };
});

import { GET, DELETE } from '../route';
import { prisma } from '@/lib/db';

describe('admin purge-staging-data API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock return values for GET (preview counts)
    vi.mocked(prisma.user.count).mockResolvedValue(5 as never);
    vi.mocked(prisma.conversation.count).mockResolvedValue(10 as never);
    vi.mocked(prisma.message.count).mockResolvedValue(50 as never);
    vi.mocked(prisma.flashcardProgress.count).mockResolvedValue(20 as never);
    vi.mocked(prisma.quizResult.count).mockResolvedValue(15 as never);
    vi.mocked(prisma.material.count).mockResolvedValue(8 as never);
    vi.mocked(prisma.sessionMetrics.count).mockResolvedValue(30 as never);
    vi.mocked(prisma.userActivity.count).mockResolvedValue(40 as never);
    vi.mocked(prisma.telemetryEvent.count).mockResolvedValue(100 as never);
    vi.mocked(prisma.studySession.count).mockResolvedValue(12 as never);
    vi.mocked(prisma.funnelEvent.count).mockResolvedValue(25 as never);

    // Default for DELETE (audit log)
    vi.mocked(prisma.complianceAuditEntry.create).mockResolvedValue({
      id: 'audit-1',
      eventType: 'admin_action',
      severity: 'info',
    } as never);

    // Default for DELETE ($transaction)
    const mockTx = {
      user: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
      conversation: { deleteMany: vi.fn().mockResolvedValue({ count: 10 }) },
      message: { deleteMany: vi.fn().mockResolvedValue({ count: 50 }) },
      flashcardProgress: { deleteMany: vi.fn().mockResolvedValue({ count: 20 }) },
      quizResult: { deleteMany: vi.fn().mockResolvedValue({ count: 15 }) },
      material: { deleteMany: vi.fn().mockResolvedValue({ count: 8 }) },
      sessionMetrics: { deleteMany: vi.fn().mockResolvedValue({ count: 30 }) },
      userActivity: { deleteMany: vi.fn().mockResolvedValue({ count: 40 }) },
      telemetryEvent: { deleteMany: vi.fn().mockResolvedValue({ count: 100 }) },
      studySession: { deleteMany: vi.fn().mockResolvedValue({ count: 12 }) },
      funnelEvent: { deleteMany: vi.fn().mockResolvedValue({ count: 25 }) },
    };
    vi.mocked(prisma.$transaction).mockImplementation((callback: unknown) =>
      (callback as Function)(mockTx),
    );
  });

  describe('GET - Preview counts', () => {
    it('returns counts of test data records', async () => {
      const request = new NextRequest('http://localhost/api/admin/purge-staging-data');

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('users', 5);
      expect(body).toHaveProperty('conversations', 10);
      expect(body).toHaveProperty('messages', 50);
      expect(body).toHaveProperty('flashcardProgress', 20);
      expect(body).toHaveProperty('quizResults', 15);
      expect(body).toHaveProperty('materials', 8);
      expect(body).toHaveProperty('sessionMetrics', 30);
      expect(body).toHaveProperty('userActivity', 40);
      expect(body).toHaveProperty('telemetryEvents', 100);
      expect(body).toHaveProperty('studySessions', 12);
      expect(body).toHaveProperty('funnelEvents', 25);
      expect(body).toHaveProperty('total');
      expect(body.total).toBe(315); // Sum of all counts
    });

    it('returns 401 if not authenticated', async () => {
      const { validateAdminReadOnlyAuth } = await import('@/lib/auth/server');
      vi.mocked(validateAdminReadOnlyAuth).mockResolvedValueOnce({
        authenticated: false,
        canAccessAdminReadOnly: false,
        userId: null,
      });

      const request = new NextRequest('http://localhost/api/admin/purge-staging-data');

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 403 if not admin', async () => {
      const { validateAdminReadOnlyAuth } = await import('@/lib/auth/server');
      vi.mocked(validateAdminReadOnlyAuth).mockResolvedValueOnce({
        authenticated: true,
        canAccessAdminReadOnly: false,
        userId: 'user-1',
      });

      const request = new NextRequest('http://localhost/api/admin/purge-staging-data');

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toHaveProperty('error', 'Forbidden: admin access required');
    });
  });

  describe('DELETE - Purge test data', () => {
    it('deletes all test data records', async () => {
      const request = new NextRequest('http://localhost/api/admin/purge-staging-data');

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('deleted', 315);
    });

    it('logs the purge action in audit log', async () => {
      const { prisma } = await import('@/lib/db');
      const request = new NextRequest('http://localhost/api/admin/purge-staging-data');

      await DELETE(request);

      expect(prisma.complianceAuditEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'admin_action',
          severity: 'info',
          description: expect.stringContaining('Purged staging data'),
          adminId: 'admin-1',
        }),
      });
    });

    it('returns 401 if not authenticated', async () => {
      const { validateAdminAuth } = await import('@/lib/auth/server');
      vi.mocked(validateAdminAuth).mockResolvedValueOnce({
        authenticated: false,
        isAdmin: false,
        userId: null,
      });

      const request = new NextRequest('http://localhost/api/admin/purge-staging-data');

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 403 if not admin', async () => {
      const { validateAdminAuth } = await import('@/lib/auth/server');
      vi.mocked(validateAdminAuth).mockResolvedValueOnce({
        authenticated: true,
        isAdmin: false,
        userId: 'user-1',
      });

      const request = new NextRequest('http://localhost/api/admin/purge-staging-data');

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toHaveProperty('error', 'Forbidden: admin access required');
    });
  });
});
