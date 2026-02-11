/**
 * Campaign Service Tests
 * Tests for email campaign management functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  getRecipientPreview,
  buildRecipientQuery,
  sendCampaign,
  type RecipientFilters,
} from '../campaign-service';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    emailCampaign: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    emailRecipient: {
      create: vi.fn(),
    },
  },
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

// Mock email service
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

// Mock preference service
vi.mock('@/lib/email/preference-service', () => ({
  canSendTo: vi.fn(),
  getPreferences: vi.fn(),
}));

// Mock template service
vi.mock('@/lib/email/template-service', () => ({
  renderTemplate: vi.fn(),
}));

// Mock observability
vi.mock('@/lib/observability/resend-limits', () => ({
  getResendLimits: vi.fn(),
}));

describe('buildRecipientQuery', () => {
  it('should build query for tier filters', () => {
    const filters: RecipientFilters = {
      tiers: ['base', 'pro'],
    };
    const query = buildRecipientQuery(filters);
    expect(query.subscription).toEqual({
      tier: { code: { in: ['base', 'pro'] } },
    });
  });

  it('should build query for role filters', () => {
    const filters: RecipientFilters = {
      roles: ['USER', 'ADMIN'],
    };
    const query = buildRecipientQuery(filters);
    expect(query.role).toEqual({ in: ['USER', 'ADMIN'] });
  });

  it('should build query for language filters', () => {
    const filters: RecipientFilters = {
      languages: ['it', 'en'],
    };
    const query = buildRecipientQuery(filters);
    expect(query.settings).toEqual({
      language: { in: ['it', 'en'] },
    });
  });

  it('should build query for school level filters', () => {
    const filters: RecipientFilters = {
      schoolLevels: ['superiore', 'media'],
    };
    const query = buildRecipientQuery(filters);
    expect(query.profile).toEqual({
      schoolLevel: { in: ['superiore', 'media'] },
    });
  });

  it('should build query for disabled filter', () => {
    const filters: RecipientFilters = {
      disabled: false,
    };
    const query = buildRecipientQuery(filters);
    expect(query.disabled).toBe(false);
  });

  it('should build query for isTestData filter', () => {
    const filters: RecipientFilters = {
      isTestData: false,
    };
    const query = buildRecipientQuery(filters);
    expect(query.isTestData).toBe(false);
  });

  it('should build query with multiple filters combined', () => {
    const filters: RecipientFilters = {
      tiers: ['pro'],
      languages: ['it'],
      disabled: false,
      isTestData: false,
    };
    const query = buildRecipientQuery(filters);
    expect(query).toEqual({
      subscription: {
        tier: { code: { in: ['pro'] } },
      },
      settings: {
        language: { in: ['it'] },
      },
      disabled: false,
      isTestData: false,
    });
  });

  it('should return empty object for no filters', () => {
    const filters: RecipientFilters = {};
    const query = buildRecipientQuery(filters);
    expect(query).toEqual({});
  });
});

describe('createCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create campaign with DRAFT status', async () => {
    const mockCampaign = {
      id: 'camp_123',
      name: 'Test Campaign',
      templateId: 'tpl_456',
      filters: { tiers: ['base'] },
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin_789',
    };

    vi.mocked(prisma.emailCampaign.create).mockResolvedValue(mockCampaign as any);

    const result = await createCampaign(
      'Test Campaign',
      'tpl_456',
      { tiers: ['base'] },
      'admin_789',
    );

    expect(result).toEqual(mockCampaign);
    expect(prisma.emailCampaign.create).toHaveBeenCalledWith({
      data: {
        name: 'Test Campaign',
        templateId: 'tpl_456',
        filters: { tiers: ['base'] },
        status: 'DRAFT',
        adminId: 'admin_789',
      },
    });
  });
});

describe('getCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return campaign by id', async () => {
    const mockCampaign = {
      id: 'camp_123',
      name: 'Test Campaign',
      templateId: 'tpl_456',
      filters: { tiers: ['base'] },
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin_789',
      template: {
        id: 'tpl_456',
        name: 'Template Name',
        subject: 'Subject',
        htmlBody: '<p>Body</p>',
        textBody: 'Body',
        category: 'newsletter',
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(mockCampaign as any);

    const result = await getCampaign('camp_123');

    expect(result).toEqual(mockCampaign);
    expect(prisma.emailCampaign.findUnique).toHaveBeenCalledWith({
      where: { id: 'camp_123' },
      include: { template: true },
    });
  });

  it('should return null if campaign not found', async () => {
    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(null);

    const result = await getCampaign('nonexistent');

    expect(result).toBeNull();
  });
});

describe('listCampaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all campaigns ordered by createdAt DESC', async () => {
    const mockCampaigns = [
      {
        id: 'camp_1',
        name: 'Campaign 1',
        templateId: 'tpl_1',
        filters: {},
        status: 'SENT',
        sentCount: 100,
        failedCount: 0,
        createdAt: new Date('2026-02-07'),
        sentAt: new Date(),
        adminId: 'admin_1',
      },
      {
        id: 'camp_2',
        name: 'Campaign 2',
        templateId: 'tpl_2',
        filters: {},
        status: 'DRAFT',
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date('2026-02-06'),
        sentAt: null,
        adminId: 'admin_1',
      },
    ];

    vi.mocked(prisma.emailCampaign.findMany).mockResolvedValue(mockCampaigns as any);

    const result = await listCampaigns();

    expect(result).toEqual(mockCampaigns);
    expect(prisma.emailCampaign.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { template: true },
    });
  });

  it('should filter campaigns by status', async () => {
    const mockCampaigns = [
      {
        id: 'camp_1',
        name: 'Draft Campaign',
        templateId: 'tpl_1',
        filters: {},
        status: 'DRAFT',
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date(),
        sentAt: null,
        adminId: 'admin_1',
      },
    ];

    vi.mocked(prisma.emailCampaign.findMany).mockResolvedValue(mockCampaigns as any);

    const result = await listCampaigns({ status: 'DRAFT' });

    expect(result).toEqual(mockCampaigns);
    expect(prisma.emailCampaign.findMany).toHaveBeenCalledWith({
      where: { status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { template: true },
    });
  });
});

describe('getRecipientPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return count and sample users', async () => {
    const mockUsers = [
      {
        id: 'user_1',
        email: 'user1@example.com',
        profile: { name: 'User One' },
      },
      {
        id: 'user_2',
        email: 'user2@example.com',
        profile: { name: 'User Two' },
      },
    ];

    vi.mocked(prisma.user.count).mockResolvedValue(100);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

    const result = await getRecipientPreview({ tiers: ['base'] });

    expect(result.totalCount).toBe(100);
    expect(result.sampleUsers).toEqual([
      { id: 'user_1', email: 'user1@example.com', name: 'User One' },
      { id: 'user_2', email: 'user2@example.com', name: 'User Two' },
    ]);
  });

  it('should handle users without profiles', async () => {
    const mockUsers = [{ id: 'user_1', email: 'user1@example.com', profile: null }];

    vi.mocked(prisma.user.count).mockResolvedValue(1);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

    const result = await getRecipientPreview({});

    expect(result.sampleUsers[0]).toEqual({
      id: 'user_1',
      email: 'user1@example.com',
      name: null,
    });
  });

  it('should pass correct where clause to prisma', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await getRecipientPreview({ tiers: ['pro'], disabled: false });

    const expectedWhere = {
      subscription: {
        tier: { code: { in: ['pro'] } },
      },
      disabled: false,
    };

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      take: 10,
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            name: true,
          },
        },
      },
    });
  });
});

describe('sendCampaign', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://test.com');
  });

  const mockCampaign = {
    id: 'campaign-123',
    name: 'Test Campaign',
    templateId: 'template-456',
    filters: { tiers: ['base'] },
    status: 'DRAFT',
    sentCount: 0,
    failedCount: 0,
    createdAt: new Date('2024-01-01'),
    sentAt: null,
    adminId: 'admin-789',
    template: {
      id: 'template-456',
      name: 'Test Template',
      subject: 'Hello {{name}}',
      htmlBody: '<p>Hello {{name}}</p>',
      textBody: 'Hello {{name}}',
      category: 'announcements',
      variables: {},
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  };

  it('should check quota and block if exceeded', async () => {
    const mockRecipients = [
      {
        id: 'user-1',
        email: 'user1@test.com',
        username: 'user1',
        profile: null,
        settings: null,
        subscription: null,
      },
      {
        id: 'user-2',
        email: 'user2@test.com',
        username: 'user2',
        profile: null,
        settings: null,
        subscription: null,
      },
      {
        id: 'user-3',
        email: 'user3@test.com',
        username: 'user3',
        profile: null,
        settings: null,
        subscription: null,
      },
    ];

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValueOnce(mockCampaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockRecipients as any);
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    vi.mocked(getResendLimits).mockResolvedValueOnce({
      emailsToday: {
        used: 99,
        limit: 100,
        percent: 99,
        status: 'critical' as const,
      },
      emailsMonth: {
        used: 900,
        limit: 1000,
        percent: 90,
        status: 'warning' as const,
      },
      timestamp: Date.now(),
    });

    await expect(sendCampaign('campaign-123')).rejects.toThrow(
      'Insufficient email quota: need 3, available 1',
    );
  });

  it('should skip users without consent (canSendTo returns false)', async () => {
    const mockRecipients = [
      {
        id: 'user-1',
        email: 'user1@test.com',
        username: 'user1',
        profile: { name: 'User One' },
        settings: { language: 'it' },
        subscription: null,
      },
    ];

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValueOnce(mockCampaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockRecipients as any);
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    vi.mocked(getResendLimits).mockResolvedValueOnce({
      emailsToday: { used: 0, limit: 100, percent: 0, status: 'ok' as const },
      emailsMonth: { used: 0, limit: 1000, percent: 0, status: 'ok' as const },
      timestamp: Date.now(),
    });

    const { getPreferences, canSendTo } = await import('@/lib/email/preference-service');
    vi.mocked(getPreferences).mockResolvedValueOnce({
      id: 'pref-1',
      userId: 'user-1',
      productUpdates: true,
      educationalNewsletter: true,
      announcements: false,
      unsubscribeToken: 'token-123',
      consentedAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(canSendTo).mockResolvedValueOnce(false);

    await sendCampaign('campaign-123');

    const { sendEmail } = await import('@/lib/email');
    expect(sendEmail).not.toHaveBeenCalled();
    expect(prisma.emailCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'campaign-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          failedCount: 1,
        }),
      }),
    );
  });

  it('should inject unsubscribe URL in email', async () => {
    const mockRecipients = [
      {
        id: 'user-1',
        email: 'user1@test.com',
        username: 'user1',
        profile: { name: 'User One' },
        settings: { language: 'it' },
        subscription: { tier: { code: 'base' } },
      },
    ];

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValueOnce(mockCampaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockRecipients as any);
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    vi.mocked(getResendLimits).mockResolvedValueOnce({
      emailsToday: { used: 0, limit: 100, percent: 0, status: 'ok' as const },
      emailsMonth: { used: 0, limit: 1000, percent: 0, status: 'ok' as const },
      timestamp: Date.now(),
    });

    const { getPreferences, canSendTo } = await import('@/lib/email/preference-service');
    vi.mocked(getPreferences).mockResolvedValueOnce({
      id: 'pref-1',
      userId: 'user-1',
      productUpdates: true,
      educationalNewsletter: true,
      announcements: true,
      unsubscribeToken: 'token-xyz',
      consentedAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(canSendTo).mockResolvedValueOnce(true);

    const { renderTemplate } = await import('@/lib/email/template-service');
    vi.mocked(renderTemplate).mockResolvedValueOnce({
      subject: 'Hello User One',
      htmlBody: '<p>Hello User One</p>',
      textBody: 'Hello User One',
    });

    const { sendEmail } = await import('@/lib/email');
    vi.mocked(sendEmail).mockResolvedValueOnce({
      success: true,
      messageId: 'msg-123',
    });

    await sendCampaign('campaign-123');

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'https://test.com/unsubscribe?token=token-xyz&category=announcements',
        ),
      }),
    );
  });

  it('should update campaign status DRAFT->SENDING->SENT', async () => {
    const mockRecipients = [
      {
        id: 'user-1',
        email: 'user1@test.com',
        username: 'user1',
        profile: { name: 'User One' },
        settings: { language: 'it' },
        subscription: { tier: { code: 'base' } },
      },
    ];

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValueOnce(mockCampaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockRecipients as any);
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    vi.mocked(getResendLimits).mockResolvedValueOnce({
      emailsToday: { used: 0, limit: 100, percent: 0, status: 'ok' as const },
      emailsMonth: { used: 0, limit: 1000, percent: 0, status: 'ok' as const },
      timestamp: Date.now(),
    });

    const { getPreferences, canSendTo } = await import('@/lib/email/preference-service');
    vi.mocked(getPreferences).mockResolvedValueOnce({
      id: 'pref-1',
      userId: 'user-1',
      productUpdates: true,
      educationalNewsletter: true,
      announcements: true,
      unsubscribeToken: 'token-abc',
      consentedAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(canSendTo).mockResolvedValueOnce(true);

    const { renderTemplate } = await import('@/lib/email/template-service');
    vi.mocked(renderTemplate).mockResolvedValueOnce({
      subject: 'Hello User One',
      htmlBody: '<p>Hello User One</p>',
      textBody: 'Hello User One',
    });

    const { sendEmail } = await import('@/lib/email');
    vi.mocked(sendEmail).mockResolvedValueOnce({
      success: true,
      messageId: 'msg-456',
    });

    vi.mocked(prisma.emailRecipient.create).mockResolvedValueOnce({
      id: 'recipient-1',
      campaignId: 'campaign-123',
      userId: 'user-1',
      email: 'user1@test.com',
      status: 'SENT',
      resendMessageId: 'msg-456',
      sentAt: new Date(),
    } as any);

    await sendCampaign('campaign-123');

    expect(prisma.emailCampaign.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'campaign-123' },
        data: { status: 'SENDING' },
      }),
    );
    expect(prisma.emailCampaign.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'campaign-123' },
        data: expect.objectContaining({
          status: 'SENT',
          sentCount: 1,
          sentAt: expect.any(Date),
        }),
      }),
    );
  });

  it('should create EmailRecipient records', async () => {
    const mockRecipients = [
      {
        id: 'user-1',
        email: 'user1@test.com',
        username: 'user1',
        profile: { name: 'User One' },
        settings: { language: 'it' },
        subscription: { tier: { code: 'base' } },
      },
    ];

    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValueOnce(mockCampaign as any);
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockRecipients as any);
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    vi.mocked(getResendLimits).mockResolvedValueOnce({
      emailsToday: { used: 0, limit: 100, percent: 0, status: 'ok' as const },
      emailsMonth: { used: 0, limit: 1000, percent: 0, status: 'ok' as const },
      timestamp: Date.now(),
    });

    const { getPreferences, canSendTo } = await import('@/lib/email/preference-service');
    vi.mocked(getPreferences).mockResolvedValueOnce({
      id: 'pref-1',
      userId: 'user-1',
      productUpdates: true,
      educationalNewsletter: true,
      announcements: true,
      unsubscribeToken: 'token-def',
      consentedAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(canSendTo).mockResolvedValueOnce(true);

    const { renderTemplate } = await import('@/lib/email/template-service');
    vi.mocked(renderTemplate).mockResolvedValueOnce({
      subject: 'Hello User One',
      htmlBody: '<p>Hello User One</p>',
      textBody: 'Hello User One',
    });

    const { sendEmail } = await import('@/lib/email');
    vi.mocked(sendEmail).mockResolvedValueOnce({
      success: true,
      messageId: 'msg-789',
    });

    vi.mocked(prisma.emailRecipient.create).mockResolvedValueOnce({
      id: 'recipient-1',
      campaignId: 'campaign-123',
      userId: 'user-1',
      email: 'user1@test.com',
      status: 'SENT',
      resendMessageId: 'msg-789',
      sentAt: new Date(),
    } as any);

    await sendCampaign('campaign-123');

    expect(prisma.emailRecipient.create).toHaveBeenCalledWith({
      data: {
        campaignId: 'campaign-123',
        userId: 'user-1',
        email: 'user1@test.com',
        status: 'SENT',
        resendMessageId: 'msg-789',
        sentAt: expect.any(Date),
      },
    });
  });
});
