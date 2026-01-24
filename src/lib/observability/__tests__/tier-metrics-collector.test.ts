/**
 * Unit tests for Tier Metrics Collector
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
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

describe("Tier Metrics Collector", () => {
  const mockPrisma = prisma as any;
  const instanceLabels = { instance: "test", env: "test" };
  const timestamp = 1234567890;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("collectTierMetrics", () => {
    it("should return metric samples for users by tier", async () => {
      // Mock: 5 trial, 3 base, 2 pro users
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: "tier-1" },
        { _count: { id: 3 }, tierId: "tier-2" },
        { _count: { id: 2 }, tierId: "tier-3" },
      ]);

      // Mock tier definitions
      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
        { id: "tier-2", code: "base" },
        { id: "tier-3", code: "pro" },
      ]);

      // Mock per-tier queries (activeCount, mauCount, dauCount) for each tier
      mockPrisma.userSubscription.count
        // tier-1 (trial)
        .mockResolvedValueOnce(4) // trial activeCount/WAU (7d)
        .mockResolvedValueOnce(4) // trial mauCount/MAU (30d)
        .mockResolvedValueOnce(2) // trial dauCount/DAU (1d)
        // tier-2 (base)
        .mockResolvedValueOnce(2) // base activeCount/WAU (7d)
        .mockResolvedValueOnce(3) // base mauCount/MAU (30d)
        .mockResolvedValueOnce(1) // base dauCount/DAU (1d)
        // tier-3 (pro)
        .mockResolvedValueOnce(1) // pro activeCount/WAU (7d)
        .mockResolvedValueOnce(2) // pro mauCount/MAU (30d)
        .mockResolvedValueOnce(1); // pro dauCount/DAU (1d)

      // Mock tier changes (with JSON parsing for upgrade/downgrade detection)
      mockPrisma.tierAuditLog.findMany.mockResolvedValueOnce([
        // 10 upgrades (trial->base or base->pro)
        ...Array(10).fill({
          changes: { from: { tierId: "tier-1" }, to: { tierId: "tier-2" } },
        }),
        // 2 downgrades (pro->base or base->trial)
        ...Array(2).fill({
          changes: { from: { tierId: "tier-3" }, to: { tierId: "tier-2" } },
        }),
      ]);

      // Mock second tierDefinition.findMany for sortOrder lookup
      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", sortOrder: 0 }, // trial
        { id: "tier-2", sortOrder: 1 }, // base
        { id: "tier-3", sortOrder: 2 }, // pro
      ]);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      // Should return 26 samples:
      // - 3 users_by_tier (trial, base, pro)
      // - 3 active_users_by_tier (trial, base, pro)
      // - 3 total active per tier
      // - 3 wau_by_tier (trial, base, pro)
      // - 3 mau_by_tier (trial, base, pro)
      // - 3 dau_by_tier (trial, base, pro)
      // - 3 churned_users_by_tier (trial, base, pro)
      // - 3 churn_rate_by_tier (trial, base, pro)
      // - 1 upgrades counter
      // - 1 downgrades counter
      expect(samples).toHaveLength(26);

      // Check users_by_tier metrics
      const trialUsers = samples.find(
        (s) =>
          s.name === "mirrorbuddy_users_by_tier" && s.labels.tier === "trial",
      );
      expect(trialUsers).toBeDefined();
      expect(trialUsers?.value).toBe(5);
      expect(trialUsers?.timestamp).toBe(timestamp);

      const baseUsers = samples.find(
        (s) =>
          s.name === "mirrorbuddy_users_by_tier" && s.labels.tier === "base",
      );
      expect(baseUsers?.value).toBe(3);

      const proUsers = samples.find(
        (s) =>
          s.name === "mirrorbuddy_users_by_tier" && s.labels.tier === "pro",
      );
      expect(proUsers?.value).toBe(2);
    });

    it("should return active users by tier (last 7 days)", async () => {
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: "tier-1" },
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
      ]);

      // Mock counts for: active (7d), mau (30d), dau (1d), churned (30+ days)
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(3) // activeCount/WAU (7d)
        .mockResolvedValueOnce(4) // mauCount/MAU (30d)
        .mockResolvedValueOnce(2) // dauCount/DAU (1d)
        .mockResolvedValueOnce(1); // churned (30+ days)

      // Mock empty tier changes
      mockPrisma.tierAuditLog.findMany.mockResolvedValueOnce([]);
      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", sortOrder: 0 },
      ]);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const activeUsers = samples.find(
        (s) =>
          s.name === "mirrorbuddy_active_users_by_tier" &&
          s.labels.tier === "trial",
      );

      expect(activeUsers).toBeDefined();
      expect(activeUsers?.value).toBe(3);
    });

    it("should return upgrade/downgrade counters based on sortOrder", async () => {
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([]);
      mockPrisma.tierDefinition.findMany
        .mockResolvedValueOnce([]) // First call for tier codes
        .mockResolvedValueOnce([
          { id: "tier-trial", sortOrder: 0 },
          { id: "tier-base", sortOrder: 1 },
          { id: "tier-pro", sortOrder: 2 },
        ]);

      mockPrisma.tierAuditLog.findMany.mockResolvedValueOnce([
        // 15 upgrades (lower sortOrder -> higher sortOrder)
        ...Array(10).fill({
          changes: {
            from: { tierId: "tier-trial" },
            to: { tierId: "tier-base" },
          },
        }),
        ...Array(5).fill({
          changes: {
            from: { tierId: "tier-base" },
            to: { tierId: "tier-pro" },
          },
        }),
        // 5 downgrades (higher sortOrder -> lower sortOrder)
        ...Array(3).fill({
          changes: {
            from: { tierId: "tier-pro" },
            to: { tierId: "tier-base" },
          },
        }),
        ...Array(2).fill({
          changes: {
            from: { tierId: "tier-base" },
            to: { tierId: "tier-trial" },
          },
        }),
        // 2 new subscriptions (from is null) - should not count
        ...Array(2).fill({
          changes: { from: null, to: { tierId: "tier-trial" } },
        }),
      ]);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const upgrades = samples.find(
        (s) => s.name === "mirrorbuddy_tier_upgrades_total",
      );
      expect(upgrades).toBeDefined();
      expect(upgrades?.value).toBe(15);

      const downgrades = samples.find(
        (s) => s.name === "mirrorbuddy_tier_downgrades_total",
      );
      expect(downgrades).toBeDefined();
      expect(downgrades?.value).toBe(5);
    });

    it("should handle empty database gracefully", async () => {
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([]);
      mockPrisma.tierDefinition.findMany
        .mockResolvedValueOnce([]) // First call for tier codes
        .mockResolvedValueOnce([]); // Second call for sortOrder
      mockPrisma.tierAuditLog.findMany.mockResolvedValueOnce([]);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      // Should still return upgrade/downgrade metrics with 0 values
      expect(samples).toHaveLength(2);

      const upgrades = samples.find(
        (s) => s.name === "mirrorbuddy_tier_upgrades_total",
      );
      expect(upgrades?.value).toBe(0);

      const downgrades = samples.find(
        (s) => s.name === "mirrorbuddy_tier_downgrades_total",
      );
      expect(downgrades?.value).toBe(0);
    });

    it("should include instance labels in all samples", async () => {
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: "tier-1" },
      ]);
      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
      ]);
      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(3) // activeCount
        .mockResolvedValueOnce(4) // mauCount
        .mockResolvedValueOnce(2) // dauCount
        .mockResolvedValueOnce(1); // churned
      mockPrisma.tierAuditLog.findMany.mockResolvedValueOnce([
        ...Array(10).fill({
          changes: { from: { tierId: "tier-1" }, to: { tierId: "tier-2" } },
        }),
        ...Array(2).fill({
          changes: { from: { tierId: "tier-2" }, to: { tierId: "tier-1" } },
        }),
      ]);
      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", sortOrder: 0 },
        { id: "tier-2", sortOrder: 1 },
      ]);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      // All samples should have instance labels
      samples.forEach((sample) => {
        expect(sample.labels).toMatchObject(instanceLabels);
      });
    });

    it("should handle database errors", async () => {
      mockPrisma.userSubscription.groupBy.mockRejectedValueOnce(
        new Error("Database error"),
      );

      await expect(
        collectTierMetrics(instanceLabels, timestamp),
      ).rejects.toThrow("Database error");
    });

    it("should return churned users count by tier (inactive 30+ days)", async () => {
      // Users inactive for 30+ days
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: "tier-1" }, // 5 trial users
        { _count: { id: 3 }, tierId: "tier-2" }, // 3 base users
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
        { id: "tier-2", code: "base" },
      ]);

      // Mock counts for: active (7d), mau (30d), dau (1d), churned (30+ days inactive)
      mockPrisma.userSubscription.count
        // tier-1 (trial)
        .mockResolvedValueOnce(4) // activeCount/WAU (7d)
        .mockResolvedValueOnce(4) // mauCount/MAU (30d)
        .mockResolvedValueOnce(2) // dauCount/DAU (1d)
        .mockResolvedValueOnce(2) // churned (30+ days)
        // tier-2 (base)
        .mockResolvedValueOnce(2) // activeCount/WAU (7d)
        .mockResolvedValueOnce(3) // mauCount/MAU (30d)
        .mockResolvedValueOnce(1) // dauCount/DAU (1d)
        .mockResolvedValueOnce(1); // churned (30+ days)

      mockPrisma.tierAuditLog.findMany.mockResolvedValueOnce([
        ...Array(10).fill({
          changes: { from: { tierId: "tier-1" }, to: { tierId: "tier-2" } },
        }),
        ...Array(2).fill({
          changes: { from: { tierId: "tier-2" }, to: { tierId: "tier-1" } },
        }),
      ]);
      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", sortOrder: 0 },
        { id: "tier-2", sortOrder: 1 },
      ]);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialChurned = samples.find(
        (s) =>
          s.name === "mirrorbuddy_churned_users_by_tier" &&
          s.labels.tier === "trial",
      );
      expect(trialChurned).toBeDefined();
      expect(trialChurned?.value).toBe(2);

      const baseChurned = samples.find(
        (s) =>
          s.name === "mirrorbuddy_churned_users_by_tier" &&
          s.labels.tier === "base",
      );
      expect(baseChurned).toBeDefined();
      expect(baseChurned?.value).toBe(1);
    });

    it("should return churn rate by tier (churned / total ratio)", async () => {
      // 5 trial users total, 2 churned = 40% churn rate
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 5 }, tierId: "tier-1" }, // 5 trial users
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
      ]);

      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(4) // activeCount/WAU (7d)
        .mockResolvedValueOnce(4) // mauCount/MAU (30d)
        .mockResolvedValueOnce(2) // dauCount/DAU (1d)
        .mockResolvedValueOnce(2); // churned (30+ days)

      mockPrisma.tierAuditLog.findMany.mockResolvedValueOnce([]);
      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", sortOrder: 0 },
      ]);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const trialChurnRate = samples.find(
        (s) =>
          s.name === "mirrorbuddy_churn_rate_by_tier" &&
          s.labels.tier === "trial",
      );
      expect(trialChurnRate).toBeDefined();
      expect(trialChurnRate?.value).toBeCloseTo(0.4, 5); // 2/5 = 0.4
    });

    it("should return 0 churn rate when no users in tier", async () => {
      mockPrisma.userSubscription.groupBy.mockResolvedValueOnce([
        { _count: { id: 0 }, tierId: "tier-1" }, // 0 users
      ]);

      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", code: "trial" },
      ]);

      mockPrisma.userSubscription.count
        .mockResolvedValueOnce(0) // activeCount/WAU (7d)
        .mockResolvedValueOnce(0) // mauCount/MAU (30d)
        .mockResolvedValueOnce(0) // dauCount/DAU (1d)
        .mockResolvedValueOnce(0); // churned (30+ days)

      mockPrisma.tierAuditLog.findMany.mockResolvedValueOnce([]);
      mockPrisma.tierDefinition.findMany.mockResolvedValueOnce([
        { id: "tier-1", sortOrder: 0 },
      ]);

      const samples = await collectTierMetrics(instanceLabels, timestamp);

      const churnRate = samples.find(
        (s) =>
          s.name === "mirrorbuddy_churn_rate_by_tier" &&
          s.labels.tier === "trial",
      );
      expect(churnRate).toBeDefined();
      expect(churnRate?.value).toBe(0);
    });
  });
});
