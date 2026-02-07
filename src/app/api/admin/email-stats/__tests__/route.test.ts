/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
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

const mockGetGlobalStats = vi.fn();
const mockGetRecentCampaignStats = vi.fn();

vi.mock("@/lib/email/stats-service", () => ({
  getGlobalStats: (...args: unknown[]) => mockGetGlobalStats(...args),
  getRecentCampaignStats: (...args: unknown[]) =>
    mockGetRecentCampaignStats(...args),
}));

vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: () =>
    Promise.resolve({
      authenticated: true,
      userId: "admin-user-123",
      isAdmin: true,
    }),
}));

describe("GET /api/admin/email-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns global stats and recent campaigns", async () => {
    const mockGlobalStats = {
      totalCampaigns: 5,
      sent: 1000,
      delivered: 950,
      opened: 300,
      bounced: 30,
      failed: 20,
      openRate: 30.0,
      deliveryRate: 95.0,
      bounceRate: 3.0,
    };

    const mockRecentStats = [
      {
        campaignId: "campaign-1",
        campaignName: "Welcome Email",
        sent: 500,
        delivered: 475,
        opened: 150,
        bounced: 15,
        failed: 10,
        openRate: 30.0,
        deliveryRate: 95.0,
        bounceRate: 3.0,
      },
      {
        campaignId: "campaign-2",
        campaignName: "Newsletter",
        sent: 500,
        delivered: 475,
        opened: 150,
        bounced: 15,
        failed: 10,
        openRate: 30.0,
        deliveryRate: 95.0,
        bounceRate: 3.0,
      },
    ];

    mockGetGlobalStats.mockResolvedValueOnce(mockGlobalStats);
    mockGetRecentCampaignStats.mockResolvedValueOnce(mockRecentStats);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-stats",
      { method: "GET" },
    );

    const handler = GET as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.global).toEqual(mockGlobalStats);
    expect(data.recent).toEqual(mockRecentStats);
    expect(mockGetGlobalStats).toHaveBeenCalledWith();
    expect(mockGetRecentCampaignStats).toHaveBeenCalledWith(10);
  });

  it("handles empty stats gracefully", async () => {
    const mockGlobalStats = {
      totalCampaigns: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      bounced: 0,
      failed: 0,
      openRate: 0,
      deliveryRate: 0,
      bounceRate: 0,
    };

    mockGetGlobalStats.mockResolvedValueOnce(mockGlobalStats);
    mockGetRecentCampaignStats.mockResolvedValueOnce([]);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-stats",
      { method: "GET" },
    );

    const handler = GET as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.global.totalCampaigns).toBe(0);
    expect(data.recent).toEqual([]);
  });

  it("handles database errors from getGlobalStats", async () => {
    mockGetGlobalStats.mockRejectedValueOnce(new Error("Database error"));
    mockGetRecentCampaignStats.mockResolvedValueOnce([]);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-stats",
      { method: "GET" },
    );

    const handler = GET as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to fetch email stats");
  });

  it("handles database errors from getRecentCampaignStats", async () => {
    const mockGlobalStats = {
      totalCampaigns: 5,
      sent: 1000,
      delivered: 950,
      opened: 300,
      bounced: 30,
      failed: 20,
      openRate: 30.0,
      deliveryRate: 95.0,
      bounceRate: 3.0,
    };

    mockGetGlobalStats.mockResolvedValueOnce(mockGlobalStats);
    mockGetRecentCampaignStats.mockRejectedValueOnce(new Error("Query failed"));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-stats",
      { method: "GET" },
    );

    const handler = GET as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to fetch email stats");
  });
});
