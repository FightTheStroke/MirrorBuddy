/**
 * Campaign Service - Waitlist / Dual-Source Tests
 * TDD: tests written BEFORE implementation (RED state expected).
 * Covers: buildWaitlistRecipientQuery, sendCampaign(source), getRecipientPreview(source).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  buildWaitlistRecipientQuery,
  sendCampaign,
  getRecipientPreview,
} from '../campaign-service';

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
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/email/preference-service', () => ({ canSendTo: vi.fn(), getPreferences: vi.fn() }));
vi.mock('@/lib/email/template-service', () => ({ renderTemplate: vi.fn() }));
vi.mock('@/lib/observability/resend-limits', () => ({ getResendLimits: vi.fn() }));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const okLimits = {
  emailsToday: { used: 0, limit: 1000, percent: 0, status: 'ok' as const },
  emailsMonth: { used: 0, limit: 10000, percent: 0, status: 'ok' as const },
  timestamp: Date.now(),
};

const baseTemplate = {
  id: 'tpl-1',
  name: 'T',
  subject: 'Hi {{name}}',
  htmlBody: '<p>{{promoCode}}</p>',
  textBody: '{{promoCode}}',
  category: 'announcements',
  variables: {},
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const makeCampaign = (extra: Record<string, unknown> = {}) => ({
  id: 'camp-w1',
  name: 'WL Campaign',
  templateId: 'tpl-1',
  filters: {},
  status: 'DRAFT',
  sentCount: 0,
  failedCount: 0,
  adminId: 'admin-1',
  createdAt: new Date('2026-01-01'),
  sentAt: null,
  template: baseTemplate,
  ...extra,
});

const wlEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'wl-1',
  email: 'lead@example.com',
  name: 'Lead User',
  locale: 'it',
  source: 'coming-soon',
  isTestData: false,
  gdprConsentAt: new Date('2026-01-01'),
  gdprConsentVersion: '1.0',
  marketingConsent: true,
  marketingConsentAt: new Date('2026-01-01'),
  verificationToken: 'vt-1',
  verificationExpiresAt: new Date('2026-12-31'),
  verifiedAt: new Date('2026-01-02'),
  unsubscribeToken: 'ut-1',
  unsubscribedAt: null,
  promoCode: 'PROMO2026',
  promoRedeemedAt: null,
  convertedUserId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const mockRender = { subject: 's', htmlBody: 'h', textBody: 't' };

// ---------------------------------------------------------------------------
// buildWaitlistRecipientQuery
// ---------------------------------------------------------------------------

describe('buildWaitlistRecipientQuery', () => {
  it('requires verifiedAt not null', () => {
    expect(buildWaitlistRecipientQuery({}).verifiedAt).toEqual({ not: null });
  });

  it('requires unsubscribedAt to be null (GDPR)', () => {
    expect(buildWaitlistRecipientQuery({}).unsubscribedAt).toBeNull();
  });

  it('combines both constraints', () => {
    expect(buildWaitlistRecipientQuery({})).toMatchObject({
      verifiedAt: { not: null },
      unsubscribedAt: null,
    });
  });

  it('supports optional locale filter', () => {
    expect(buildWaitlistRecipientQuery({ locales: ['it', 'en'] }).locale).toEqual({
      in: ['it', 'en'],
    });
  });
});

// ---------------------------------------------------------------------------
// getRecipientPreview - combined source
// ---------------------------------------------------------------------------

describe('getRecipientPreview with source', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns combined count for source=both', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(30);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.waitlistEntry.count).mockResolvedValue(20);
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([]);

    const result = await getRecipientPreview({}, 'both');

    expect(result.totalCount).toBe(50);
    expect(prisma.waitlistEntry.count).toHaveBeenCalled();
    expect(prisma.user.count).toHaveBeenCalled();
  });

  it('returns only waitlist count for source=waitlist', async () => {
    vi.mocked(prisma.waitlistEntry.count).mockResolvedValue(15);
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([]);

    const result = await getRecipientPreview({}, 'waitlist');

    expect(result.totalCount).toBe(15);
    expect(prisma.user.count).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// sendCampaign - source=waitlist
// ---------------------------------------------------------------------------

describe('sendCampaign with source=waitlist', () => {
  beforeEach(() => vi.resetAllMocks());

  const setupBase = async (entryOverrides: Record<string, unknown> = {}) => {
    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(
      makeCampaign({ source: 'waitlist' }) as any,
    );
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([wlEntry(entryOverrides)] as any);
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    vi.mocked(getResendLimits).mockResolvedValue(okLimits);
    const { renderTemplate } = await import('@/lib/email/template-service');
    vi.mocked(renderTemplate).mockResolvedValue(mockRender);
    const { sendEmail } = await import('@/lib/email');
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'm' });
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({ id: 'r-1' } as any);
    return { sendEmail, renderTemplate };
  };

  it('queries WaitlistEntry with verified+unsubscribed constraints', async () => {
    await setupBase();
    await sendCampaign('camp-w1', 'waitlist');
    expect(prisma.waitlistEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ verifiedAt: { not: null }, unsubscribedAt: null }),
      }),
    );
  });

  it('does NOT call canSendTo for waitlist leads', async () => {
    await setupBase();
    await sendCampaign('camp-w1', 'waitlist');
    const { canSendTo } = await import('@/lib/email/preference-service');
    expect(canSendTo).not.toHaveBeenCalled();
  });

  it('populates {{promoCode}} from WaitlistEntry.promoCode', async () => {
    const { renderTemplate } = await setupBase({ promoCode: 'WELCOME50' });
    await sendCampaign('camp-w1', 'waitlist');
    expect(renderTemplate).toHaveBeenCalledWith(
      'tpl-1',
      expect.objectContaining({ promoCode: 'WELCOME50' }),
    );
  });

  it('GDPR: skips entry with unsubscribedAt set', async () => {
    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(
      makeCampaign({ source: 'waitlist' }) as any,
    );
    // Entry has unsubscribedAt — implementation must guard inside the loop
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      wlEntry({ unsubscribedAt: new Date('2026-01-10') }),
    ] as any);
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    vi.mocked(getResendLimits).mockResolvedValue(okLimits);
    const { renderTemplate } = await import('@/lib/email/template-service');
    vi.mocked(renderTemplate).mockResolvedValue(mockRender);
    const { sendEmail } = await import('@/lib/email');
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'm' });
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({ id: 'r-g' } as any);

    await sendCampaign('camp-w1', 'waitlist');

    expect(sendEmail).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// sendCampaign - source=both
// ---------------------------------------------------------------------------

describe('sendCampaign with source=both', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends to both registered users AND waitlist leads', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      username: 'ux',
      profile: { name: 'Reg', schoolLevel: null, gradeLevel: null, age: null },
      settings: { language: 'it' },
      subscription: { tier: { code: 'base' } },
    };
    vi.mocked(prisma.emailCampaign.findUnique).mockResolvedValue(
      makeCampaign({ source: 'both' }) as any,
    );
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as any);
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([wlEntry()] as any);
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    vi.mocked(getResendLimits).mockResolvedValue(okLimits);
    const { canSendTo, getPreferences } = await import('@/lib/email/preference-service');
    vi.mocked(canSendTo).mockResolvedValue(true);
    vi.mocked(getPreferences).mockResolvedValue({
      id: 'p-1',
      userId: 'user-1',
      productUpdates: true,
      educationalNewsletter: true,
      announcements: true,
      unsubscribeToken: 'tok',
      consentedAt: new Date(),
      updatedAt: new Date(),
    });
    const { renderTemplate } = await import('@/lib/email/template-service');
    vi.mocked(renderTemplate).mockResolvedValue(mockRender);
    const { sendEmail } = await import('@/lib/email');
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'm' });
    vi.mocked(prisma.emailRecipient.create).mockResolvedValue({ id: 'r-5' } as any);

    await sendCampaign('camp-w1', 'both');

    // Two calls: one for user, one for waitlist lead
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});
