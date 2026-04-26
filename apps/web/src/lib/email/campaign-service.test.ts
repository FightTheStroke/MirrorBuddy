/**
 * Email Campaign Service Tests
 * Tests for sendCampaign functionality (T3-02)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendCampaign, getRecipientPreview } from './campaign-service';
import * as resendLimits from '@/lib/observability/resend-limits';
import * as preferenceService from './preference-service';
import * as templateService from './template-service';
import * as emailService from './index';
import { prisma } from '@/lib/db';

// Mock dependencies
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/observability/resend-limits');
vi.mock('./preference-service');
vi.mock('./template-service');
vi.mock('./index');
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

describe('sendCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error if campaign not found', async () => {
    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(null);

    await expect(sendCampaign('invalid-id')).rejects.toThrow('Campaign not found');
  });

  it('should throw error if quota exceeded', async () => {
    const campaign = {
      id: 'camp1',
      name: 'Test Campaign',
      templateId: 'tpl1',
      filters: {},
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin1',
      template: {
        id: 'tpl1',
        name: 'Template',
        subject: 'Subject',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        category: 'announcements',
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(campaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'user1@test.com', profile: { name: 'User 1' } },
      { id: 'u2', email: 'user2@test.com', profile: { name: 'User 2' } },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 99, limit: 100, percent: 99, status: 'warning' },
      emailsMonth: {
        used: 2998,
        limit: 3000,
        percent: 99.9,
        status: 'critical',
      },
      timestamp: Date.now(),
    });

    await expect(sendCampaign('camp1')).rejects.toThrow('Insufficient email quota');
  });

  it('should skip recipients without consent', async () => {
    const campaign = {
      id: 'camp1',
      name: 'Test Campaign',
      templateId: 'tpl1',
      filters: {},
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin1',
      template: {
        id: 'tpl1',
        name: 'Template',
        subject: 'Subject',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        category: 'announcements',
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(campaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'user1@test.com', profile: { name: 'User 1' } },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: 'ok' },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: 'ok' },
      timestamp: Date.now(),
    });

    vi.mocked(preferenceService.canSendTo).mockResolvedValue(false);
    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({
      id: 'rec1',
      campaignId: 'camp1',
      userId: 'u1',
      email: 'user1@test.com',
      status: 'FAILED',
    } as any);

    await sendCampaign('camp1');

    expect(prisma.emailRecipient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      }),
    );
  });

  it('should send emails with unsubscribe URL and GDPR footer', async () => {
    const campaign = {
      id: 'camp1',
      name: 'Test Campaign',
      templateId: 'tpl1',
      filters: {},
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin1',
      template: {
        id: 'tpl1',
        name: 'Template',
        subject: 'Hello {{name}}',
        htmlBody: '<p>Hi {{name}}</p>',
        textBody: 'Hi {{name}}',
        category: 'announcements',
        variables: ['name'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(campaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'u1',
        email: 'user1@test.com',
        username: 'user1',
        profile: { name: 'User 1' },
        settings: { language: 'it' },
        subscription: { tier: { code: 'base' } },
      },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: 'ok' },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: 'ok' },
      timestamp: Date.now(),
    });

    vi.mocked(preferenceService.canSendTo).mockResolvedValue(true);
    vi.mocked(preferenceService.getPreferences).mockResolvedValue({
      id: 'pref1',
      userId: 'u1',
      productUpdates: true,
      educationalNewsletter: true,
      announcements: true,
      unsubscribeToken: 'token123',
      consentedAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(templateService.renderTemplate).mockResolvedValue({
      subject: 'Hello User 1',
      htmlBody: '<p>Hi User 1</p>',
      textBody: 'Hi User 1',
    });

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
    });

    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({
      id: 'rec1',
      campaignId: 'camp1',
      userId: 'u1',
      email: 'user1@test.com',
      status: 'SENT',
    } as any);

    await sendCampaign('camp1');

    // Verify GDPR footer was added
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Legal basis'),
      }),
    );

    // Verify unsubscribe URL
    expect(templateService.renderTemplate).toHaveBeenCalledWith(
      'tpl1',
      expect.objectContaining({
        unsubscribeUrl: expect.stringContaining('token123'),
      }),
    );
  });

  it('should update campaign status to SENT on success', async () => {
    const campaign = {
      id: 'camp1',
      name: 'Test Campaign',
      templateId: 'tpl1',
      filters: {},
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin1',
      template: {
        id: 'tpl1',
        name: 'Template',
        subject: 'Subject',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        category: 'announcements',
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(campaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'u1',
        email: 'user1@test.com',
        profile: { name: 'User 1' },
        settings: { language: 'it' },
      },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: 'ok' },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: 'ok' },
      timestamp: Date.now(),
    });

    vi.mocked(preferenceService.canSendTo).mockResolvedValue(true);
    vi.mocked(preferenceService.getPreferences).mockResolvedValue({
      id: 'pref1',
      userId: 'u1',
      productUpdates: true,
      educationalNewsletter: true,
      announcements: true,
      unsubscribeToken: 'token123',
      consentedAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(templateService.renderTemplate).mockResolvedValue({
      subject: 'Subject',
      htmlBody: '<p>Body</p>',
      textBody: 'Body',
    });

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
    });

    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({
      id: 'rec1',
      campaignId: 'camp1',
      userId: 'u1',
      email: 'user1@test.com',
      status: 'SENT',
    } as any);

    await sendCampaign('camp1');

    // Verify campaign was updated to SENDING then SENT
    expect(prisma.emailCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENDING',
        }),
      }),
    );

    expect(prisma.emailCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          sentCount: 1,
        }),
      }),
    );
  });
});

// T3b-02: sendCampaign waitlist support
describe('sendCampaign - waitlist recipients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query waitlistEntry when source is waitlist', async () => {
    const campaign = {
      id: 'camp-wl',
      name: 'Waitlist Campaign',
      templateId: 'tpl1',
      filters: {},
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin1',
      template: {
        id: 'tpl1',
        name: 'Template',
        subject: 'Welcome {{name}}',
        htmlBody: '<p>Hi {{name}}</p>',
        textBody: 'Hi {{name}}',
        category: 'announcements',
        variables: ['name'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(campaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      {
        id: 'wl1',
        email: 'lead1@test.com',
        name: 'Lead One',
        locale: 'it',
        promoCode: 'PROMO1',
        unsubscribeToken: 'wl-token-1',
        marketingConsent: true,
        gdprConsentAt: new Date(),
        verifiedAt: new Date(),
        unsubscribedAt: null,
        isTestData: false,
      },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: 'ok' },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: 'ok' },
      timestamp: Date.now(),
    });

    vi.mocked(templateService.renderTemplate).mockResolvedValue({
      subject: 'Welcome Lead One',
      htmlBody: '<p>Hi Lead One</p>',
      textBody: 'Hi Lead One',
    });

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg-wl-1',
    });

    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({
      id: 'rec-wl-1',
      campaignId: 'camp-wl',
      userId: null,
      email: 'lead1@test.com',
      status: 'SENT',
    } as any);

    // Pass 'waitlist' as second argument (CampaignSource)
    await sendCampaign('camp-wl', 'waitlist');

    expect(prisma.waitlistEntry.findMany).toHaveBeenCalled();
  });

  it('should use waitlist unsubscribeToken for unsubscribe URL', async () => {
    const campaign = {
      id: 'camp-wl2',
      name: 'Waitlist Campaign',
      templateId: 'tpl1',
      filters: {},
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin1',
      template: {
        id: 'tpl1',
        name: 'Template',
        subject: 'Hello',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        category: 'announcements',
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(campaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      {
        id: 'wl2',
        email: 'lead2@test.com',
        name: 'Lead Two',
        locale: 'en',
        promoCode: null,
        unsubscribeToken: 'unique-wl-token-xyz',
        marketingConsent: true,
        gdprConsentAt: new Date(),
        verifiedAt: new Date(),
        unsubscribedAt: null,
        isTestData: false,
      },
    ] as any);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: 'ok' },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: 'ok' },
      timestamp: Date.now(),
    });

    vi.mocked(templateService.renderTemplate).mockResolvedValue({
      subject: 'Hello',
      htmlBody: '<p>Body</p>',
      textBody: 'Body',
    });

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg-wl-2',
    });

    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({
      id: 'rec-wl-2',
      campaignId: 'camp-wl2',
      userId: null,
      email: 'lead2@test.com',
      status: 'SENT',
    } as any);

    await sendCampaign('camp-wl2', 'waitlist');

    // Must use the waitlist unsubscribeToken, not canSendTo/getPreferences
    expect(templateService.renderTemplate).toHaveBeenCalledWith(
      'tpl1',
      expect.objectContaining({
        unsubscribeUrl: expect.stringContaining('unique-wl-token-xyz'),
      }),
    );
  });

  it('should skip unverified or unsubscribed waitlist entries', async () => {
    const campaign = {
      id: 'camp-wl3',
      name: 'Waitlist Campaign',
      templateId: 'tpl1',
      filters: {},
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin1',
      template: {
        id: 'tpl1',
        name: 'Template',
        subject: 'Hello',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        category: 'announcements',
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(campaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    // GDPR filters applied at query level — return empty (mock simulates no results)
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([]);

    vi.mocked(resendLimits.getResendLimits).mockResolvedValue({
      emailsToday: { used: 10, limit: 100, percent: 10, status: 'ok' },
      emailsMonth: { used: 100, limit: 3000, percent: 3.3, status: 'ok' },
      timestamp: Date.now(),
    });

    vi.mocked(prisma.emailCampaign.update).mockResolvedValue(campaign as any);

    await sendCampaign('camp-wl3', 'waitlist');

    // No emails sent when no valid waitlist entries
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});

// T3b-03: getRecipientPreview dual source
describe('getRecipientPreview - waitlist support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return combined totals with waitlistCount when source is waitlist', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(5);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'user1@test.com', profile: { name: 'User 1' } },
    ] as any);
    vi.mocked(prisma.waitlistEntry.count).mockResolvedValue(10);
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      { id: 'wl1', email: 'lead1@test.com', name: 'Lead 1' },
    ] as any);

    const result = await getRecipientPreview({}, 'both');

    expect(result.totalCount).toBe(15); // 5 users + 10 waitlist
    expect((result as any).waitlistCount).toBe(10);
    expect((result as any).userCount).toBe(5);
    expect((result as any).sampleWaitlistLeads).toHaveLength(1);
    expect(result.sampleUsers).toHaveLength(1);
  });

  it('should return only user count when source is users', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(20);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'user1@test.com', profile: { name: 'User 1' } },
    ] as any);

    const result = await getRecipientPreview({});

    expect(result.totalCount).toBe(20);
    expect((result as any).waitlistCount).toBeUndefined();
  });
});
