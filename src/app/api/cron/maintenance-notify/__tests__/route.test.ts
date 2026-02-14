/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { canSendTo } from '@/lib/email/preference-service';
import { sendEmail } from '@/lib/email';
import { triggerMaintenanceNotification } from '@/lib/maintenance/notification-triggers';

vi.mock('@/lib/db', () => ({
  prisma: {
    maintenanceWindow: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email/preference-service', () => ({
  canSendTo: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/maintenance/email-template', () => ({
  buildMaintenanceEmailHtml: vi.fn(() => '<p>html</p>'),
  buildMaintenanceEmailText: vi.fn(() => 'text'),
}));

vi.mock('@/lib/maintenance/notification-triggers', () => ({
  triggerMaintenanceNotification: vi.fn(),
}));

import { POST } from '../route';

describe('POST /api/cron/maintenance-notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends 24h emails only to users with allowed email preferences', async () => {
    vi.mocked(prisma.maintenanceWindow.findMany)
      .mockResolvedValueOnce([
        {
          id: 'mw-24h',
          message: 'Planned maintenance',
          startTime: new Date('2026-03-02T10:00:00.000Z'),
          endTime: new Date('2026-03-02T11:00:00.000Z'),
          estimatedMinutes: 60,
        },
      ] as never)
      .mockResolvedValueOnce([] as never);

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-1', email: 'one@example.com', username: 'one', passwordHash: 'hash' },
      { id: 'user-2', email: 'two@example.com', username: 'two', passwordHash: 'hash' },
    ] as never);

    vi.mocked(canSendTo).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'msg-1' });

    const response = await POST(
      new NextRequest('http://localhost:3000/api/cron/maintenance-notify', {
        method: 'POST',
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(canSendTo).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('triggers in-app notification for windows starting in 1-2h', async () => {
    vi.mocked(prisma.maintenanceWindow.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          id: 'mw-1h',
          message: 'Maintenance starts soon',
          startTime: new Date('2026-03-01T11:00:00.000Z'),
          endTime: new Date('2026-03-01T12:00:00.000Z'),
          estimatedMinutes: 60,
        },
      ] as never);

    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(triggerMaintenanceNotification).mockResolvedValue({ recipients: 5, created: 5 });

    const response = await POST(
      new NextRequest('http://localhost:3000/api/cron/maintenance-notify', {
        method: 'POST',
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(triggerMaintenanceNotification).toHaveBeenCalledWith({
      message: 'Maintenance starts soon',
      startTime: new Date('2026-03-01T11:00:00.000Z'),
      endTime: new Date('2026-03-01T12:00:00.000Z'),
    });
  });
});
