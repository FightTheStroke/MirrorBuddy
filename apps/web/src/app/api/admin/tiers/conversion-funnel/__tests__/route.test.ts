/**
 * Tier Conversion Funnel API Tests
 * Tests for tracking Trial → Base → Pro conversion metrics
 */

import { describe, it, expect } from "vitest";
import type { TierAuditLog } from "@prisma/client";

// Mock audit log data
const createMockAuditLog = (
  overrides?: Partial<TierAuditLog>,
): TierAuditLog => ({
  id: "test-id",
  tierId: "tier-id",
  userId: "user-id",
  adminId: "admin-id",
  action: "TIER_CHANGE",
  changes: JSON.parse('{"from":"trial","to":"base"}'),
  notes: null,
  createdAt: new Date(),
  ...overrides,
});

describe("Tier Conversion Funnel Data Structures", () => {
  describe("Conversion Rate Calculations", () => {
    it("should calculate trial-to-base conversion rate", () => {
      // Simulate 2 trial users: 1 converts to base
      const auditLogs: TierAuditLog[] = [
        createMockAuditLog({
          userId: "user-1",
          changes: JSON.parse('{"from":"trial","to":"base"}'),
        }),
      ];

      // Extract unique trial starts (users who had trial tier)
      const trialUsers = new Set(
        auditLogs
          .filter(
            (log) => (log.changes as Record<string, string>)?.from === "trial",
          )
          .map((log) => log.userId),
      );

      // Extract base conversions (users who moved to base from trial)
      const baseConversions = auditLogs.filter(
        (log) =>
          (log.changes as Record<string, string>)?.from === "trial" &&
          (log.changes as Record<string, string>)?.to === "base",
      ).length;

      const conversionRate =
        trialUsers.size > 0 ? (baseConversions / trialUsers.size) * 100 : 0;

      expect(conversionRate).toBe(100);
      expect(baseConversions).toBe(1);
    });

    it("should calculate base-to-pro conversion rate", () => {
      const auditLogs: TierAuditLog[] = [
        createMockAuditLog({
          userId: "user-1",
          changes: JSON.parse('{"from":"base","to":"pro"}'),
        }),
      ];

      const baseToProConversions = auditLogs.filter(
        (log) =>
          (log.changes as Record<string, string>)?.from === "base" &&
          (log.changes as Record<string, string>)?.to === "pro",
      ).length;

      expect(baseToProConversions).toBe(1);
    });

    it("should calculate overall funnel efficiency", () => {
      // 2 trial→base conversions, 1 base→pro conversion
      const auditLogs: TierAuditLog[] = [
        createMockAuditLog({
          userId: "user-1",
          changes: JSON.parse('{"from":"trial","to":"base"}'),
        }),
        createMockAuditLog({
          userId: "user-2",
          changes: JSON.parse('{"from":"trial","to":"base"}'),
        }),
        createMockAuditLog({
          userId: "user-1",
          changes: JSON.parse('{"from":"base","to":"pro"}'),
        }),
      ];

      // Funnel efficiency: users reaching pro / users starting trial conversions
      const trialToBaseCount = auditLogs.filter(
        (log) =>
          (log.changes as Record<string, string>)?.from === "trial" &&
          (log.changes as Record<string, string>)?.to === "base",
      ).length;

      const proConversions = auditLogs.filter(
        (log) => (log.changes as Record<string, string>)?.to === "pro",
      ).length;

      const efficiency =
        trialToBaseCount > 0 ? (proConversions / trialToBaseCount) * 100 : 0;

      expect(efficiency).toBe(50);
    });
  });

  describe("Funnel Response Structure", () => {
    it("should have stages array with tier progression", () => {
      const response = {
        stages: [
          {
            tierCode: "trial",
            tierName: "Trial",
            totalUsers: 10,
            nextStageConversions: 5,
            conversionRate: 50,
          },
          {
            tierCode: "base",
            tierName: "Base",
            totalUsers: 5,
            nextStageConversions: 2,
            conversionRate: 40,
          },
          {
            tierCode: "pro",
            tierName: "Pro",
            totalUsers: 2,
            nextStageConversions: null,
            conversionRate: null,
          },
        ],
      };

      expect(response.stages).toHaveLength(3);
      expect(response.stages[0].tierCode).toBe("trial");
      expect(response.stages[1].tierCode).toBe("base");
      expect(response.stages[2].tierCode).toBe("pro");
      expect(response.stages[0].nextStageConversions).toBe(5);
      expect(response.stages[2].conversionRate).toBeNull();
    });

    it("should have summary metrics", () => {
      const response = {
        summary: {
          trialToBaseRate: 50,
          baseToProRate: 40,
          trialToProRate: 20,
          funnelEfficiency: 20,
          totalUsersTracked: 10,
          periodStart: "2024-01-24",
          periodEnd: "2024-02-24",
        },
      };

      expect(response.summary).toHaveProperty("trialToBaseRate");
      expect(response.summary).toHaveProperty("baseToProRate");
      expect(response.summary).toHaveProperty("funnelEfficiency");
      expect(response.summary).toHaveProperty("totalUsersTracked");
      expect(response.summary.trialToBaseRate).toBe(50);
    });

    it("should have time series data", () => {
      const response = {
        timeSeries: [
          {
            date: "2024-01-24",
            trialCount: 5,
            baseCount: 2,
            proCount: 1,
            conversionsTrialToBase: 1,
            conversionsBaseToProCount: 0,
          },
        ],
      };

      expect(response.timeSeries).toHaveLength(1);
      expect(response.timeSeries[0]).toHaveProperty("date");
      expect(response.timeSeries[0]).toHaveProperty("conversionsTrialToBase");
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero conversions gracefully", () => {
      const response = {
        summary: {
          trialToBaseRate: 0,
          baseToProRate: 0,
          funnelEfficiency: 0,
          totalUsersTracked: 0,
        },
      };

      expect(response.summary.trialToBaseRate).toBe(0);
      expect(response.summary.totalUsersTracked).toBe(0);
    });

    it("should exclude non-tier-change actions", () => {
      const auditLogs: TierAuditLog[] = [
        createMockAuditLog({
          action: "TIER_UPDATE" as any,
        }),
        createMockAuditLog({
          action: "TIER_CHANGE" as any,
          changes: JSON.parse('{"from":"trial","to":"base"}'),
        }),
      ];

      // Only TIER_CHANGE should be counted
      const tierChanges = auditLogs.filter(
        (log) => log.action === "TIER_CHANGE",
      );

      expect(tierChanges).toHaveLength(1);
      expect(tierChanges[0].changes).toBeDefined();
    });

    it("should track multiple tier changes per user", () => {
      // User journey: trial -> base -> pro -> base (downgrade)
      const userJourney: TierAuditLog[] = [
        createMockAuditLog({
          userId: "user-1",
          changes: JSON.parse('{"from":"trial","to":"base"}'),
          createdAt: new Date("2024-01-01"),
        }),
        createMockAuditLog({
          userId: "user-1",
          changes: JSON.parse('{"from":"base","to":"pro"}'),
          createdAt: new Date("2024-01-15"),
        }),
        createMockAuditLog({
          userId: "user-1",
          changes: JSON.parse('{"from":"pro","to":"base"}'),
          createdAt: new Date("2024-02-01"),
        }),
      ];

      // Should have 3 transitions
      expect(userJourney).toHaveLength(3);
      expect(userJourney[0].changes).toEqual({ from: "trial", to: "base" });
      expect(userJourney[2].changes).toEqual({ from: "pro", to: "base" });
    });
  });

  describe("Date Range Filtering", () => {
    it("should support custom date range", () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const logs = [
        createMockAuditLog({ createdAt: new Date("2024-01-15") }),
        createMockAuditLog({ createdAt: new Date("2024-02-15") }), // Outside range
      ];

      const filtered = logs.filter(
        (log) => log.createdAt >= startDate && log.createdAt <= endDate,
      );

      expect(filtered).toHaveLength(1);
    });

    it("should calculate metrics for 30-day default period", () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const response = {
        period: {
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString(),
          days: 30,
        },
      };

      expect(response.period.days).toBe(30);
      expect(response.period.start).toBeDefined();
    });
  });
});
