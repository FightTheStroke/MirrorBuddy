import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { triggerMaintenanceNotification } from '@/lib/maintenance/notification-triggers';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
    },
  },
}));

describe('triggerMaintenanceNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates system maintenance notifications in batch for registered users', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ] as never);
    vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 2 });

    const result = await triggerMaintenanceNotification({
      message: 'Maintenance starts soon',
      startTime: new Date('2026-03-01T10:00:00.000Z'),
      endTime: new Date('2026-03-01T11:00:00.000Z'),
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        disabled: false,
        username: { not: null },
        passwordHash: { not: null },
      },
      select: { id: true },
    });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-1',
          type: 'system',
          message: 'Maintenance starts soon',
        }),
      ]),
    });

    const createManyCall = vi.mocked(prisma.notification.createMany).mock.calls[0]?.[0] as {
      data: Array<Record<string, unknown>>;
    };
    const firstNotification = createManyCall.data[0] as {
      metadata: string | null;
      title: string;
    };

    expect(firstNotification.title).toBe('Scheduled maintenance');
    expect(firstNotification.metadata).toContain('"subtype":"maintenance"');
    expect(result).toEqual({ recipients: 2, created: 2 });
  });

  it('returns zero counts when no registered users are found', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

    const result = await triggerMaintenanceNotification({
      message: 'Maintenance starts soon',
      startTime: new Date('2026-03-01T10:00:00.000Z'),
      endTime: new Date('2026-03-01T11:00:00.000Z'),
    });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ recipients: 0, created: 0 });
  });
});
