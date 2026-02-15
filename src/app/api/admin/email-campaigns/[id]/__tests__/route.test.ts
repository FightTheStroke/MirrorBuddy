/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAdminAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      userId: 'admin-1',
      isAdmin: true,
    }),
    validateAdminReadOnlyAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      canAccessAdminReadOnly: true,
      userId: 'admin-1',
    }),
  };
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

const { mockGetCampaign } = vi.hoisted(() => ({
  mockGetCampaign: vi.fn(),
}));

vi.mock('@/lib/email/campaign-service', () => ({
  getCampaign: (...args: unknown[]) => mockGetCampaign(...args),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    emailRecipient: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

describe('GET /api/admin/email-campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns campaign with recipient stats', async () => {
    const mockCampaign = {
      id: 'campaign-1',
      name: 'Test Campaign',
      templateId: 'template-1',
      filters: {},
      status: 'SENT',
      sentCount: 10,
      failedCount: 2,
      createdAt: new Date(),
      sentAt: new Date(),
      adminId: 'admin-1',
      template: {
        id: 'template-1',
        name: 'Welcome',
        subject: 'Welcome!',
        htmlBody: '<p>Hello</p>',
        textBody: 'Hello',
        category: 'announcements',
        variables: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const mockRecipients = [
      { status: 'SENT', deliveredAt: new Date(), openedAt: new Date() },
      { status: 'SENT', deliveredAt: new Date(), openedAt: null },
      { status: 'FAILED', deliveredAt: null, openedAt: null },
    ];

    mockGetCampaign.mockResolvedValueOnce(mockCampaign);
    (prisma.emailRecipient.findMany as any).mockResolvedValueOnce(mockRecipients);

    const request = new NextRequest('http://localhost:3000/api/admin/email-campaigns/campaign-1', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: 'campaign-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.campaign.id).toBe('campaign-1');
    expect(data.campaign.recipientStats).toEqual({
      totalSent: 2,
      totalFailed: 1,
      totalDelivered: 2,
      totalOpened: 1,
    });
  });

  it('returns 404 if campaign not found', async () => {
    mockGetCampaign.mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/admin/email-campaigns/nonexistent', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Campaign not found');
  });

  it('handles database errors', async () => {
    mockGetCampaign.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/admin/email-campaigns/campaign-1', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: 'campaign-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to get email campaign');
  });

  it('calculates stats with no recipients', async () => {
    const mockCampaign = {
      id: 'campaign-2',
      name: 'Empty Campaign',
      templateId: 'template-1',
      filters: {},
      status: 'DRAFT',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: 'admin-1',
    };

    mockGetCampaign.mockResolvedValueOnce(mockCampaign);
    (prisma.emailRecipient.findMany as any).mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/admin/email-campaigns/campaign-2', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: 'campaign-2' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.campaign.recipientStats).toEqual({
      totalSent: 0,
      totalFailed: 0,
      totalDelivered: 0,
      totalOpened: 0,
    });
  });
});
