/**
 * @jest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { DeletedUserBackup } from '@prisma/client';

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

vi.mock('@/lib/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security')>();
  return {
    ...actual,
    requireCSRF: vi.fn().mockReturnValue(true),
  };
});

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  const database = createMockPrisma();
  database.$transaction.mockImplementation((work: (client: typeof database) => Promise<unknown>) =>
    work(database),
  );
  return { prisma: database };
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

import { GET, DELETE } from '../route';
import { prisma } from '@/lib/db';

const backups = [
  {
    id: 'backup-1',
    userId: 'user-1',
    email: 'user@example.com',
    username: 'user',
    role: 'USER',
    backup: { user: { passwordHash: 'fixture-only-not-exported' } },
    deletedAt: new Date('2026-01-01T00:00:00Z'),
    purgeAt: new Date('2026-02-01T00:00:00Z'),
    deletedBy: 'admin-1',
    reason: null,
  },
] satisfies DeletedUserBackup[];

describe('admin users trash API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.deletedUserBackup.count).mockResolvedValue(backups.length);
    vi.mocked(prisma.deletedUserBackup.findMany).mockResolvedValue(backups);
    vi.mocked(prisma.deletedUserBackup.deleteMany).mockResolvedValue({ count: 1 });
  });

  it('returns deleted user backups', async () => {
    const request = new NextRequest('http://localhost/api/admin/users/trash');
    const routeContext = { params: Promise.resolve({}) };

    const response = await GET(request, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.backups).toHaveLength(1);
    expect(body.backups[0].userId).toBe('user-1');
    expect(body).toEqual({
      backups: [
        {
          userId: 'user-1',
          email: 'user@example.com',
          username: 'user',
          deletedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    expect(prisma.deletedUserBackup.findMany).toHaveBeenCalledWith({
      select: { userId: true, username: true, email: true, deletedAt: true },
      orderBy: [{ deletedAt: 'desc' }, { userId: 'desc' }],
      take: 25,
      skip: 0,
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.$transaction).mock.calls[0]?.[1]).toEqual({
      isolationLevel: 'RepeatableRead',
      timeout: 30_000,
    });
  });

  it('purges backups before cutoff', async () => {
    const request = new NextRequest(
      'http://localhost/api/admin/users/trash?before=2026-02-02T00:00:00Z',
    );
    const routeContext = { params: Promise.resolve({}) };

    const response = await DELETE(request, routeContext);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.deleted).toBe(1);
  });
});
