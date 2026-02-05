/**
 * Tests for business KPI service
 *
 * Verifies that KPI service returns null for unmeasurable metrics
 * instead of hardcoded estimates or mock data
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getBusinessKPIs, clearCache } from "../business-kpi-service";
import { prisma } from "@/lib/db";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    userSubscription: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    settings: {
      groupBy: vi.fn(),
    },
    conversation: {
      groupBy: vi.fn(),
    },
  },
}));

// Mock logger
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

describe("business-kpi-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
  });

  // ========================================================================
  // REVENUE METRICS TESTS
  // ========================================================================

  describe("getBusinessKPIs - revenue metrics", () => {
    it("returns null for growthRate when no historical data exists", async () => {
      // Setup: Mock active subscriptions
      vi.mocked(prisma.userSubscription.findMany).mockResolvedValueOnce([
        {
          id: "sub-1",
          userId: "user-1",
          tierId: "tier-pro",
          status: "ACTIVE",
          tier: { monthlyPriceEur: 9.99 },
        } as any,
      ]);
      // Mock user.count calls: totalUsers, activeUsers
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(8); // activeUsers
      // Mock userSubscription.count calls: trialUsers, paidUsers
      vi.mocked(prisma.userSubscription.count)
        .mockResolvedValueOnce(1) // trial users
        .mockResolvedValueOnce(1); // paid users
      vi.mocked(prisma.settings.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.conversation.groupBy).mockResolvedValue([]);

      const result = await getBusinessKPIs();

      // Verify: growthRate should be null (no historical data to compute it)
      expect(result.revenue.growthRate).toBeNull();
      expect(result.revenue.mrr).toBe(9.99);
      expect(result.revenue.arr).toBe(9.99 * 12);
    });

    it("returns null for totalRevenue when Stripe is not integrated", async () => {
      vi.mocked(prisma.userSubscription.findMany).mockResolvedValueOnce([
        {
          id: "sub-1",
          userId: "user-1",
          tierId: "tier-pro",
          status: "ACTIVE",
          tier: { monthlyPriceEur: 9.99 },
        } as any,
      ]);
      // Mock user.count calls: totalUsers, activeUsers
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(8); // activeUsers
      // Mock userSubscription.count calls: trialUsers, paidUsers
      vi.mocked(prisma.userSubscription.count)
        .mockResolvedValueOnce(1) // trial users
        .mockResolvedValueOnce(1); // paid users
      vi.mocked(prisma.settings.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.conversation.groupBy).mockResolvedValue([]);

      const result = await getBusinessKPIs();

      // Verify: totalRevenue should be null (no real revenue tracking without Stripe)
      expect(result.revenue.totalRevenue).toBeNull();
    });

    it("returns empty arrays when DB query fails (no mock data)", async () => {
      vi.mocked(prisma.userSubscription.findMany).mockRejectedValueOnce(
        new Error("Database error"),
      );
      vi.mocked(prisma.userSubscription.count).mockRejectedValue(
        new Error("Database error"),
      );
      vi.mocked(prisma.user.count).mockRejectedValue(
        new Error("Database error"),
      );
      vi.mocked(prisma.settings.groupBy).mockRejectedValue(
        new Error("Database error"),
      );
      vi.mocked(prisma.conversation.groupBy).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await getBusinessKPIs();

      // Verify: Should return null/zero values, NOT mock data
      expect(result.revenue.mrr).toBe(0);
      expect(result.revenue.arr).toBe(0);
      expect(result.revenue.growthRate).toBeNull();
      expect(result.revenue.totalRevenue).toBeNull();
      expect(result.users.totalUsers).toBe(0);
      expect(result.users.churnRate).toBeNull();
      expect(result.topCountries).toEqual([]);
      expect(result.topMaestri).toEqual([]);
    });
  });

  // ========================================================================
  // USER METRICS TESTS
  // ========================================================================

  describe("getBusinessKPIs - user metrics", () => {
    it("returns null for churnRate when no historical data exists", async () => {
      vi.mocked(prisma.userSubscription.findMany).mockResolvedValueOnce([]);
      // Mock user.count calls: totalUsers, activeUsers
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80); // activeUsers
      // Mock userSubscription.count calls: trialUsers, paidUsers
      vi.mocked(prisma.userSubscription.count)
        .mockResolvedValueOnce(10) // trial users
        .mockResolvedValueOnce(5); // paid users
      vi.mocked(prisma.settings.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.conversation.groupBy).mockResolvedValue([]);

      const result = await getBusinessKPIs();

      // Verify: churnRate should be null (requires historical data)
      expect(result.users.churnRate).toBeNull();
      expect(result.users.totalUsers).toBe(100);
    });

    it("computes trialConversionRate from actual data", async () => {
      vi.mocked(prisma.userSubscription.findMany).mockResolvedValueOnce([]);
      // Mock user.count calls: totalUsers, activeUsers
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80); // activeUsers
      // Mock userSubscription.count calls: trialUsers, paidUsers
      vi.mocked(prisma.userSubscription.count)
        .mockResolvedValueOnce(50) // trial users
        .mockResolvedValueOnce(25); // paid users
      vi.mocked(prisma.settings.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.conversation.groupBy).mockResolvedValue([]);

      const result = await getBusinessKPIs();

      // Verify: trialConversionRate should be computed from actual data
      expect(result.users.trialConversionRate).toBe(50); // 25/50 * 100 = 50%
    });
  });

  // ========================================================================
  // COUNTRY METRICS TESTS
  // ========================================================================

  describe("getBusinessKPIs - country metrics", () => {
    it("returns null for revenue when per-user revenue is unknown", async () => {
      vi.mocked(prisma.userSubscription.findMany).mockResolvedValueOnce([]);
      // Mock user.count calls: totalUsers, activeUsers
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80); // activeUsers
      // Mock userSubscription.count calls: trialUsers, paidUsers
      vi.mocked(prisma.userSubscription.count)
        .mockResolvedValueOnce(0) // trial users
        .mockResolvedValueOnce(0); // paid users
      vi.mocked(prisma.settings.groupBy).mockResolvedValueOnce([
        { language: "it", _count: 50 },
        { language: "en", _count: 30 },
      ] as any);
      vi.mocked(prisma.conversation.groupBy).mockResolvedValue([]);

      const result = await getBusinessKPIs();

      // Verify: revenue should be null (no per-user revenue without Stripe)
      expect(result.topCountries[0].users).toBe(50);
      expect(result.topCountries[0].revenue).toBeNull();
      expect(result.topCountries[1].users).toBe(30);
      expect(result.topCountries[1].revenue).toBeNull();
    });
  });

  // ========================================================================
  // MAESTRO METRICS TESTS
  // ========================================================================

  describe("getBusinessKPIs - maestro metrics", () => {
    it("returns null for avgDuration when not tracked", async () => {
      vi.mocked(prisma.userSubscription.findMany).mockResolvedValueOnce([]);
      // Mock user.count calls: totalUsers, activeUsers
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80); // activeUsers
      // Mock userSubscription.count calls: trialUsers, paidUsers
      vi.mocked(prisma.userSubscription.count)
        .mockResolvedValueOnce(0) // trial users
        .mockResolvedValueOnce(0); // paid users
      vi.mocked(prisma.settings.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.conversation.groupBy).mockResolvedValueOnce([
        { maestroId: "leonardo-da-vinci", _count: 100 },
        { maestroId: "marie-curie", _count: 75 },
      ] as any);

      const result = await getBusinessKPIs();

      // Verify: avgDuration should be null (not tracked)
      expect(result.topMaestri[0].sessions).toBe(100);
      expect(result.topMaestri[0].avgDuration).toBeNull();
      expect(result.topMaestri[1].sessions).toBe(75);
      expect(result.topMaestri[1].avgDuration).toBeNull();
    });
  });
});
