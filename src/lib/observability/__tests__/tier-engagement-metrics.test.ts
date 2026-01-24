/**
 * Unit tests for Tier Engagement Metrics (DAU/WAU/MAU)
 * TDD: Write tests BEFORE implementation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { collectTierMetrics } from "../tier-metrics-collector";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    userSubscription: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    tierDefinition: {
      findMany: vi.fn(),
    },
    tierAuditLog: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

describe("Tier Engagement Metrics (DAU/WAU/MAU)", () => {
  const mockPrisma = prisma as any;
  const instanceLabels = { instance: "test", env: "test" };
  const timestamp = 1234567890;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DAU/WAU/MAU metrics", () => {
    it("should return DAU (Daily Active Users) by tier", async () => {
      // Setup mocks
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 10 }, tierId: "tier-1" },
        { _count: { id: 8 }, tierId: "tier-2" },
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
        { id: "tier-2", code: "base" },
      ]);

      // Mock order: per-tier queries execute sequentially within loop
      // tier-1: activeCount, mauCount, dauCount, churned | tier-2: activeCount, mauCount, dauCount, churned
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(9) // trial activeCount (7d)
        .mockResolvedValueOnce(10) // trial mauCount (30d)
        .mockResolvedValueOnce(6) // trial dauCount (1d)
        .mockResolvedValueOnce(1) // trial churned (30+ days)
        .mockResolvedValueOnce(7) // base activeCount (7d)
        .mockResolvedValueOnce(8) // base mauCount (30d)
        .mockResolvedValueOnce(5) // base dauCount (1d)
        .mockResolvedValueOnce(1); // base churned (30+ days)

      mockPrisma.tierAuditLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialDAU = samples.find(
        (s) =>
          s.name === "mirrorbuddy_dau_by_tier" && s.labels.tier === "trial",
      );
      expect(trialDAU).toBeDefined();
      expect(trialDAU?.value).toBe(6);

      const baseDAU = samples.find(
        (s) => s.name === "mirrorbuddy_dau_by_tier" && s.labels.tier === "base",
      );
      expect(baseDAU).toBeDefined();
      expect(baseDAU?.value).toBe(5);
    });

    it("should return WAU (Weekly Active Users) by tier", async () => {
      // Setup mocks
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 10 }, tierId: "tier-1" },
        { _count: { id: 8 }, tierId: "tier-2" },
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
        { id: "tier-2", code: "base" },
      ]);

      // Mock order: per-tier queries execute sequentially within loop
      // tier-1: activeCount, mauCount, dauCount, churned | tier-2: activeCount, mauCount, dauCount, churned
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(9) // trial activeCount/WAU (7d)
        .mockResolvedValueOnce(10) // trial mauCount/MAU (30d)
        .mockResolvedValueOnce(6) // trial dauCount/DAU (1d)
        .mockResolvedValueOnce(1) // trial churned (30+ days)
        .mockResolvedValueOnce(7) // base activeCount/WAU (7d)
        .mockResolvedValueOnce(8) // base mauCount/MAU (30d)
        .mockResolvedValueOnce(5) // base dauCount/DAU (1d)
        .mockResolvedValueOnce(1); // base churned (30+ days)

      mockPrisma.tierAuditLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialWAU = samples.find(
        (s) =>
          s.name === "mirrorbuddy_wau_by_tier" && s.labels.tier === "trial",
      );
      expect(trialWAU).toBeDefined();
      expect(trialWAU?.value).toBe(9);

      const baseWAU = samples.find(
        (s) => s.name === "mirrorbuddy_wau_by_tier" && s.labels.tier === "base",
      );
      expect(baseWAU).toBeDefined();
      expect(baseWAU?.value).toBe(7);
    });

    it("should return MAU (Monthly Active Users) by tier", async () => {
      // Setup mocks
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 10 }, tierId: "tier-1" },
        { _count: { id: 8 }, tierId: "tier-2" },
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
        { id: "tier-2", code: "base" },
      ]);

      // Mock order: per-tier queries execute sequentially within loop
      // tier-1: activeCount, mauCount, dauCount, churned | tier-2: activeCount, mauCount, dauCount, churned
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(9) // trial activeCount/WAU (7d)
        .mockResolvedValueOnce(10) // trial mauCount/MAU (30d)
        .mockResolvedValueOnce(6) // trial dauCount/DAU (1d)
        .mockResolvedValueOnce(1) // trial churned (30+ days)
        .mockResolvedValueOnce(7) // base activeCount/WAU (7d)
        .mockResolvedValueOnce(8) // base mauCount/MAU (30d)
        .mockResolvedValueOnce(5) // base dauCount/DAU (1d)
        .mockResolvedValueOnce(1); // base churned (30+ days)

      mockPrisma.tierAuditLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialMAU = samples.find(
        (s) =>
          s.name === "mirrorbuddy_mau_by_tier" && s.labels.tier === "trial",
      );
      expect(trialMAU).toBeDefined();
      expect(trialMAU?.value).toBe(10);

      const baseMAU = samples.find(
        (s) => s.name === "mirrorbuddy_mau_by_tier" && s.labels.tier === "base",
      );
      expect(baseMAU).toBeDefined();
      expect(baseMAU?.value).toBe(8);
    });

    it("should include DAU/WAU/MAU metrics in sample count", async () => {
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: "tier-1" },
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
      ]);

      // Mock order: per-tier queries execute sequentially within loop
      // tier-1: activeCount, mauCount, dauCount, churned
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(4) // trial activeCount/WAU (7d)
        .mockResolvedValueOnce(5) // trial mauCount/MAU (30d)
        .mockResolvedValueOnce(3) // trial dauCount/DAU (1d)
        .mockResolvedValueOnce(1); // trial churned (30+ days)

      mockPrisma.tierAuditLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      // Should include: users_by_tier, active_users_by_tier, total_active, wau, mau, dau, churned, churn_rate, upgrades, downgrades
      // = 8 (trial) + 1 (upgrades) + 1 (downgrades) = 10 samples
      const dauMetrics = samples.filter(
        (s) =>
          s.name === "mirrorbuddy_dau_by_tier" ||
          s.name === "mirrorbuddy_wau_by_tier" ||
          s.name === "mirrorbuddy_mau_by_tier",
      );
      expect(dauMetrics.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle zero DAU/WAU/MAU values", async () => {
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: "tier-1" },
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
      ]);

      // Mock order: per-tier queries execute sequentially within loop
      // tier-1: activeCount, mauCount, dauCount, churned
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(0) // trial activeCount/WAU = 0 (7d)
        .mockResolvedValueOnce(0) // trial mauCount/MAU = 0 (30d)
        .mockResolvedValueOnce(0) // trial dauCount/DAU = 0 (1d)
        .mockResolvedValueOnce(5); // trial churned = 5 (30+ days)

      mockPrisma.tierAuditLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialDAU = samples.find(
        (s) =>
          s.name === "mirrorbuddy_dau_by_tier" && s.labels.tier === "trial",
      );
      expect(trialDAU?.value).toBe(0);

      const trialWAU = samples.find(
        (s) =>
          s.name === "mirrorbuddy_wau_by_tier" && s.labels.tier === "trial",
      );
      expect(trialWAU?.value).toBe(0);

      const trialMAU = samples.find(
        (s) =>
          s.name === "mirrorbuddy_mau_by_tier" && s.labels.tier === "trial",
      );
      expect(trialMAU?.value).toBe(0);
    });
  });
});
