/**
 * @jest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { prisma } from '@/lib/db';

describe('user-trash-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates backup with 30-day purge', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      username: 'user1',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      disabled: false,
      passwordHash: 'hash',
      mustChangePassword: false,
    } as never);

    vi.mocked(prisma.deletedUserBackup.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.deletedUserBackup.create).mockResolvedValue({
      id: 'backup-1',
    } as never);

    const { createDeletedUserBackup } = await import('../user-trash-service');

    await createDeletedUserBackup('user-1', 'admin-1', 'test');

    expect(prisma.deletedUserBackup.create).toHaveBeenCalled();
  });

  it('purges expired backups', async () => {
    vi.mocked(prisma.deletedUserBackup.deleteMany).mockResolvedValue({
      count: 2,
    });

    const { purgeExpiredUserBackups } = await import('../user-trash-service');
    const count = await purgeExpiredUserBackups();

    expect(count).toBe(2);
  });
});
