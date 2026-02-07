/**
 * Stats Service Tests - Email campaign statistics and analytics functions
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  getCampaignStats,
  getGlobalStats,
  getRecentCampaignStats,
  getOpenTimeline,
} from "../stats-service";

vi.mock("@/lib/db", () => ({
  prisma: {
    emailCampaign: { findUnique: vi.fn(), findMany: vi.fn() },
    emailRecipient: { groupBy: vi.fn() },
    emailEvent: { findMany: vi.fn() },
  },
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

// Test helpers
const mockCampaign = (id: string, name: string) =>
  vi
    .mocked(prisma.emailCampaign.findUnique)
    .mockResolvedValue({ id, name } as any);

const mockStatusCounts = (counts: Array<{ status: string; count: number }>) =>
  vi
    .mocked(prisma.emailRecipient.groupBy)
    .mockResolvedValue(
      counts.map(({ status, count }) => ({
        status,
        _count: { id: count },
      })) as any,
    );

describe("getCampaignStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should calculate sent/delivered/opened/bounced/failed counts correctly", async () => {
    mockCampaign("c1", "Test Campaign");
    mockStatusCounts([
      { status: "SENT", count: 10 },
      { status: "DELIVERED", count: 20 },
      { status: "OPENED", count: 15 },
      { status: "BOUNCED", count: 3 },
      { status: "FAILED", count: 2 },
      { status: "PENDING", count: 5 },
    ]);
    const stats = await getCampaignStats("c1");
    expect(stats).toMatchObject({
      sent: 50,
      delivered: 35,
      opened: 15,
      bounced: 3,
      failed: 2,
      campaignName: "Test Campaign",
    });
  });

  it("should calculate openRate as percentage (0-100)", async () => {
    mockCampaign("c2", "Test");
    mockStatusCounts([
      { status: "SENT", count: 15 },
      { status: "OPENED", count: 5 },
    ]);
    expect((await getCampaignStats("c2")).openRate).toBe(25);
  });

  it("should calculate deliveryRate correctly", async () => {
    mockCampaign("c3", "Test");
    mockStatusCounts([
      { status: "SENT", count: 20 },
      { status: "DELIVERED", count: 30 },
    ]);
    expect((await getCampaignStats("c3")).deliveryRate).toBe(60);
  });

  it("should calculate bounceRate correctly", async () => {
    mockCampaign("c4", "Test");
    mockStatusCounts([
      { status: "SENT", count: 90 },
      { status: "BOUNCED", count: 10 },
    ]);
    expect((await getCampaignStats("c4")).bounceRate).toBe(10);
  });

  it("should return zero rates when no emails sent", async () => {
    mockCampaign("c5", "Empty");
    mockStatusCounts([{ status: "PENDING", count: 10 }]);
    const stats = await getCampaignStats("c5");
    expect(stats).toMatchObject({
      sent: 0,
      openRate: 0,
      deliveryRate: 0,
      bounceRate: 0,
    });
  });
});

describe("getGlobalStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should aggregate across all campaigns", async () => {
    vi.mocked(prisma.emailCampaign.findMany).mockResolvedValue([
      { id: "c1" },
      { id: "c2" },
      { id: "c3" },
    ] as any);
    mockStatusCounts([
      { status: "SENT", count: 100 },
      { status: "DELIVERED", count: 80 },
      { status: "OPENED", count: 40 },
      { status: "BOUNCED", count: 15 },
      { status: "FAILED", count: 5 },
    ]);
    const stats = await getGlobalStats();
    expect(stats).toMatchObject({
      totalCampaigns: 3,
      sent: 240,
      delivered: 120,
      opened: 40,
      bounced: 15,
      failed: 5,
      deliveryRate: 50,
    });
    expect(stats.openRate).toBeCloseTo(16.67, 1);
    expect(stats.bounceRate).toBeCloseTo(6.25, 1);
  });

  it("should filter by date range", async () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-01-31");
    vi.mocked(prisma.emailCampaign.findMany).mockResolvedValue([
      { id: "c1" },
      { id: "c2" },
    ] as any);
    mockStatusCounts([
      { status: "SENT", count: 50 },
      { status: "OPENED", count: 25 },
    ]);
    const stats = await getGlobalStats({ from, to });
    expect(stats).toMatchObject({ totalCampaigns: 2, sent: 75, opened: 25 });
    expect(prisma.emailCampaign.findMany).toHaveBeenCalledWith({
      where: { createdAt: { gte: from, lte: to } },
      select: { id: true },
    });
  });

  it("should return zero stats when no campaigns exist", async () => {
    vi.mocked(prisma.emailCampaign.findMany).mockResolvedValue([]);
    const stats = await getGlobalStats();
    expect(stats).toMatchObject({
      totalCampaigns: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      bounced: 0,
      failed: 0,
      openRate: 0,
      deliveryRate: 0,
      bounceRate: 0,
    });
  });
});

describe("getRecentCampaignStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return last N campaigns with stats", async () => {
    vi.mocked(prisma.emailCampaign.findMany).mockResolvedValue([
      { id: "c1", name: "Recent 1" },
      { id: "c2", name: "Recent 2" },
      { id: "c3", name: "Recent 3" },
    ] as any);
    vi.mocked(prisma.emailCampaign.findUnique).mockImplementation((({
      where,
    }: any) =>
      Promise.resolve({ id: where.id, name: `Campaign ${where.id}` })) as any);
    mockStatusCounts([
      { status: "SENT", count: 10 },
      { status: "OPENED", count: 5 },
    ]);

    const stats = await getRecentCampaignStats(3);

    expect(stats).toHaveLength(3);
    expect(stats[0].campaignName).toBe("Recent 1");
    expect(stats[1].campaignName).toBe("Recent 2");
    expect(stats[2].campaignName).toBe("Recent 3");
    expect(prisma.emailCampaign.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true },
    });
  });

  it("should default to 10 campaigns when no limit provided", async () => {
    vi.mocked(prisma.emailCampaign.findMany).mockResolvedValue([]);

    await getRecentCampaignStats();

    expect(prisma.emailCampaign.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true },
    });
  });
});

describe("getOpenTimeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should group by hour and return counts", async () => {
    vi.mocked(prisma.emailEvent.findMany).mockResolvedValue([
      { receivedAt: new Date("2024-01-15T10:15:00Z") },
      { receivedAt: new Date("2024-01-15T10:45:00Z") },
      { receivedAt: new Date("2024-01-15T10:59:00Z") },
      { receivedAt: new Date("2024-01-15T11:05:00Z") },
      { receivedAt: new Date("2024-01-15T11:30:00Z") },
      { receivedAt: new Date("2024-01-15T14:20:00Z") },
    ] as any);

    const timeline = await getOpenTimeline("c1");

    expect(timeline).toHaveLength(3);
    expect(timeline[0]).toEqual({ hour: "2024-01-15T10:00", count: 3 });
    expect(timeline[1]).toEqual({ hour: "2024-01-15T11:00", count: 2 });
    expect(timeline[2]).toEqual({ hour: "2024-01-15T14:00", count: 1 });
    expect(prisma.emailEvent.findMany).toHaveBeenCalledWith({
      where: { eventType: "OPENED", recipient: { campaignId: "c1" } },
      select: { receivedAt: true },
      orderBy: { receivedAt: "asc" },
    });
  });

  it("should return empty array when no opens", async () => {
    vi.mocked(prisma.emailEvent.findMany).mockResolvedValue([]);

    const timeline = await getOpenTimeline("c2");

    expect(timeline).toHaveLength(0);
  });

  it("should sort timeline by hour ascending", async () => {
    vi.mocked(prisma.emailEvent.findMany).mockResolvedValue([
      { receivedAt: new Date("2024-01-15T14:00:00Z") },
      { receivedAt: new Date("2024-01-15T10:00:00Z") },
      { receivedAt: new Date("2024-01-15T12:00:00Z") },
    ] as any);

    const timeline = await getOpenTimeline("c3");

    expect(timeline[0].hour).toBe("2024-01-15T10:00");
    expect(timeline[1].hour).toBe("2024-01-15T12:00");
    expect(timeline[2].hour).toBe("2024-01-15T14:00");
  });
});
