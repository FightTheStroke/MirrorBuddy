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

const mockGetCampaignStats = vi.fn();
const mockGetOpenTimeline = vi.fn();

vi.mock('@/lib/email/stats-service', () => ({
  getCampaignStats: (...args: unknown[]) => mockGetCampaignStats(...args),
  getOpenTimeline: (...args: unknown[]) => mockGetOpenTimeline(...args),
}));

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAdminAuth: () =>
      Promise.resolve({
        authenticated: true,
        userId: 'admin-user-123',
        isAdmin: true,
      }),
    validateAdminReadOnlyAuth: () =>
      Promise.resolve({
        authenticated: true,
        userId: 'admin-user-123',
        canAccessAdminReadOnly: true,
      }),
  };
});

describe('GET /api/admin/email-stats/[campaignId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns campaign stats and timeline', async () => {
    const mockStats = {
      campaignId: 'campaign-1',
      campaignName: 'Welcome Email',
      sent: 500,
      delivered: 475,
      opened: 150,
      bounced: 15,
      failed: 10,
      openRate: 30.0,
      deliveryRate: 95.0,
      bounceRate: 3.0,
    };

    const mockTimeline = [
      { hour: '2024-01-15T10:00:00.000Z', count: 25 },
      { hour: '2024-01-15T11:00:00.000Z', count: 50 },
      { hour: '2024-01-15T12:00:00.000Z', count: 40 },
      { hour: '2024-01-15T13:00:00.000Z', count: 35 },
    ];

    mockGetCampaignStats.mockResolvedValueOnce(mockStats);
    mockGetOpenTimeline.mockResolvedValueOnce(mockTimeline);

    const request = new NextRequest('http://localhost:3000/api/admin/email-stats/campaign-1', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ campaignId: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ campaignId: 'campaign-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toEqual(mockStats);
    expect(data.timeline).toEqual(mockTimeline);
    expect(mockGetCampaignStats).toHaveBeenCalledWith('campaign-1');
    expect(mockGetOpenTimeline).toHaveBeenCalledWith('campaign-1');
  });

  it('handles campaign with no opens', async () => {
    const mockStats = {
      campaignId: 'campaign-2',
      campaignName: 'New Campaign',
      sent: 100,
      delivered: 95,
      opened: 0,
      bounced: 3,
      failed: 2,
      openRate: 0,
      deliveryRate: 95.0,
      bounceRate: 3.0,
    };

    mockGetCampaignStats.mockResolvedValueOnce(mockStats);
    mockGetOpenTimeline.mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/admin/email-stats/campaign-2', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ campaignId: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ campaignId: 'campaign-2' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.opened).toBe(0);
    expect(data.timeline).toEqual([]);
  });

  it('handles missing campaignId parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/email-stats/', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ campaignId: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ campaignId: '' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Campaign ID is required');
  });

  it('handles database errors from getCampaignStats', async () => {
    mockGetCampaignStats.mockRejectedValueOnce(new Error('Database error'));
    mockGetOpenTimeline.mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/admin/email-stats/campaign-1', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ campaignId: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ campaignId: 'campaign-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch campaign stats');
  });

  it('handles database errors from getOpenTimeline', async () => {
    const mockStats = {
      campaignId: 'campaign-1',
      campaignName: 'Welcome Email',
      sent: 500,
      delivered: 475,
      opened: 150,
      bounced: 15,
      failed: 10,
      openRate: 30.0,
      deliveryRate: 95.0,
      bounceRate: 3.0,
    };

    mockGetCampaignStats.mockResolvedValueOnce(mockStats);
    mockGetOpenTimeline.mockRejectedValueOnce(new Error('Query failed'));

    const request = new NextRequest('http://localhost:3000/api/admin/email-stats/campaign-1', {
      method: 'GET',
    });

    const handler = GET as (
      req: NextRequest,
      context: { params: Promise<{ campaignId: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ campaignId: 'campaign-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch campaign stats');
  });
});
