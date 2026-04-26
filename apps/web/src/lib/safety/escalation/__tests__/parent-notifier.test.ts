/**
 * Tests for parent crisis notification service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

// Mock email service
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

// Mock logger
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

// Mock email template builder
vi.mock('@/lib/email/templates/crisis-parent-notification', () => ({
  buildCrisisParentEmail: vi.fn(() => ({
    subject: 'Crisis Alert',
    html: '<p>Crisis alert email</p>',
    text: 'Crisis alert email',
  })),
}));

import { notifyParentOfCrisis } from '../parent-notifier';
import type { CrisisNotificationParams } from '../parent-notifier';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const mockSendEmail = sendEmail as any;

describe('notifyParentOfCrisis', () => {
  const baseParams: CrisisNotificationParams = {
    userId: 'user123',
    category: 'crisis',
    severity: 'critical',
    maestroId: 'maestro1',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    locale: 'it',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg123' } as any);
  });

  it('sends email when CoppaConsent exists with parentEmail', async () => {
    vi.mocked(prisma.coppaConsent.findFirst).mockResolvedValue({
      parentEmail: 'parent@example.com',
    } as any);
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.safetyEvent.findFirst).mockResolvedValue({
      id: 'event123',
      userId: 'user123',
      category: 'crisis',
      parentNotified: false,
    } as any);
    vi.mocked(prisma.safetyEvent.update).mockResolvedValue({
      id: 'event123',
      parentNotified: true,
    } as any);

    await notifyParentOfCrisis(baseParams);

    // Should query CoppaConsent
    expect(prisma.coppaConsent.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user123',
        consentGranted: true,
        parentEmail: { not: null },
      },
      select: { parentEmail: true },
    });

    // Should send email
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'parent@example.com',
      subject: 'Crisis Alert',
      html: '<p>Crisis alert email</p>',
      text: 'Crisis alert email',
    });

    // Should update SafetyEvent
    expect(prisma.safetyEvent.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user123',
        category: 'crisis',
        parentNotified: false,
      },
      orderBy: { timestamp: 'desc' },
    });
    expect(prisma.safetyEvent.update).toHaveBeenCalledWith({
      where: { id: 'event123' },
      data: {
        parentNotified: true,
        parentNotifiedAt: expect.any(Date),
      },
    });
  });

  it('sends email when Settings has guardianEmail', async () => {
    vi.mocked(prisma.coppaConsent.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({
      guardianEmail: 'guardian@example.com',
    } as any);
    vi.mocked(prisma.safetyEvent.findFirst).mockResolvedValue({
      id: 'event456',
      userId: 'user123',
      category: 'crisis',
      parentNotified: false,
    } as any);
    vi.mocked(prisma.safetyEvent.update).mockResolvedValue({
      id: 'event456',
      parentNotified: true,
    } as any);

    await notifyParentOfCrisis(baseParams);

    // Should query Settings
    expect(prisma.settings.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user123' },
      select: { guardianEmail: true },
    });

    // Should send email to guardian
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'guardian@example.com',
      subject: 'Crisis Alert',
      html: '<p>Crisis alert email</p>',
      text: 'Crisis alert email',
    });

    // Should update SafetyEvent
    expect(prisma.safetyEvent.update).toHaveBeenCalled();
  });

  it('does NOT send when no parent contact found', async () => {
    vi.mocked(prisma.coppaConsent.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({
      guardianEmail: null,
    } as any);

    await notifyParentOfCrisis(baseParams);

    // Should NOT send email
    expect(mockSendEmail).not.toHaveBeenCalled();

    // Should NOT update SafetyEvent
    expect(prisma.safetyEvent.update).not.toHaveBeenCalled();
  });

  it('updates SafetyEvent.parentNotified to true on success', async () => {
    vi.mocked(prisma.coppaConsent.findFirst).mockResolvedValue({
      parentEmail: 'parent@example.com',
    } as any);
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.safetyEvent.findFirst).mockResolvedValue({
      id: 'event789',
      userId: 'user123',
      category: 'crisis',
      parentNotified: false,
    } as any);
    vi.mocked(prisma.safetyEvent.update).mockResolvedValue({
      id: 'event789',
      parentNotified: true,
      parentNotifiedAt: new Date(),
    } as any);

    await notifyParentOfCrisis(baseParams);

    // Should mark event as parent notified
    expect(prisma.safetyEvent.update).toHaveBeenCalledWith({
      where: { id: 'event789' },
      data: {
        parentNotified: true,
        parentNotifiedAt: expect.any(Date),
      },
    });
  });

  it('handles sendEmail failure gracefully', async () => {
    vi.mocked(prisma.coppaConsent.findFirst).mockResolvedValue({
      parentEmail: 'parent@example.com',
    } as any);
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
    mockSendEmail.mockResolvedValue({
      success: false,
      error: 'Email service unavailable',
    } as any);

    // Should not throw
    await expect(notifyParentOfCrisis(baseParams)).resolves.toBeUndefined();

    // Should NOT update SafetyEvent on email failure
    expect(prisma.safetyEvent.update).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.coppaConsent.findFirst).mockRejectedValue(
      new Error('Database connection failed'),
    );

    // Should not throw
    await expect(notifyParentOfCrisis(baseParams)).resolves.toBeUndefined();

    // Should not attempt to send email
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('prefers CoppaConsent over Settings when both exist', async () => {
    vi.mocked(prisma.coppaConsent.findFirst).mockResolvedValue({
      parentEmail: 'coppa-parent@example.com',
    } as any);
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({
      guardianEmail: 'settings-guardian@example.com',
    } as any);
    vi.mocked(prisma.safetyEvent.findFirst).mockResolvedValue(null);

    await notifyParentOfCrisis(baseParams);

    // Should send to CoppaConsent email, not Settings
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'coppa-parent@example.com',
      }),
    );
  });

  it('does not update SafetyEvent if no recent event found', async () => {
    vi.mocked(prisma.coppaConsent.findFirst).mockResolvedValue({
      parentEmail: 'parent@example.com',
    } as any);
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.safetyEvent.findFirst).mockResolvedValue(null); // No recent event

    await notifyParentOfCrisis(baseParams);

    // Should still send email
    expect(mockSendEmail).toHaveBeenCalled();

    // Should NOT attempt to update (no event to update)
    expect(prisma.safetyEvent.update).not.toHaveBeenCalled();
  });
});
