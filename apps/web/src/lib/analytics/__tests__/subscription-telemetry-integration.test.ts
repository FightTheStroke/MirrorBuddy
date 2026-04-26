/**
 * @vitest-environment node
 * Integration tests for subscription telemetry system
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {
  trackSubscriptionEvent,
  subscriptionTelemetry,
} from "../subscription-telemetry";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger");
vi.stubGlobal("fetch", vi.fn());

describe("Subscription Telemetry Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Helper functions", () => {
    it("createCreated helper creates correct event", () => {
      const event = subscriptionTelemetry.helpers.createCreated(
        "user-123",
        "tier-pro",
        new Date("2026-01-24T10:00:00Z"),
        { subscriptionId: "sub-123" },
      );

      expect(event.type).toBe("subscription.created");
      expect(event.userId).toBe("user-123");
      expect(event.tierId).toBe("tier-pro");
      expect(event.previousTierId).toBeNull();
      expect(event.metadata?.subscriptionId).toBe("sub-123");
    });

    it("createUpgraded helper creates correct event", () => {
      const event = subscriptionTelemetry.helpers.createUpgraded(
        "user-123",
        "tier-enterprise",
        "tier-pro",
        new Date("2026-01-24T11:00:00Z"),
        { reason: "feature_request" },
      );

      expect(event.type).toBe("subscription.upgraded");
      expect(event.tierId).toBe("tier-enterprise");
      expect(event.previousTierId).toBe("tier-pro");
      expect(event.metadata?.reason).toBe("feature_request");
    });

    it("createDowngraded helper creates correct event", () => {
      const event = subscriptionTelemetry.helpers.createDowngraded(
        "user-123",
        "tier-free",
        "tier-pro",
        new Date("2026-01-24T12:00:00Z"),
        { reason: "cost_saving" },
      );

      expect(event.type).toBe("subscription.downgraded");
      expect(event.tierId).toBe("tier-free");
      expect(event.previousTierId).toBe("tier-pro");
    });

    it("createCancelled helper creates correct event", () => {
      const event = subscriptionTelemetry.helpers.createCancelled(
        "user-123",
        "tier-pro",
        new Date("2026-01-24T13:00:00Z"),
        { reason: "user_request" },
      );

      expect(event.type).toBe("subscription.cancelled");
      expect(event.tierId).toBe("tier-pro");
      expect(event.previousTierId).toBeNull();
      expect(event.metadata?.reason).toBe("user_request");
    });

    it("createExpired helper creates correct event", () => {
      const event = subscriptionTelemetry.helpers.createExpired(
        "user-123",
        "tier-trial",
        new Date("2026-01-24T14:00:00Z"),
        { trialEndReason: "trial_expired" },
      );

      expect(event.type).toBe("subscription.expired");
      expect(event.tierId).toBe("tier-trial");
      expect(event.previousTierId).toBeNull();
      expect(event.metadata?.trialEndReason).toBe("trial_expired");
    });
  });

  describe("Event tracking workflow", () => {
    it("tracks full lifecycle: created -> upgraded -> cancelled", () => {
      const mockFetch = fetch as unknown as Mock;
      mockFetch.mockResolvedValue({ ok: true });

      // User starts with free tier
      const created = subscriptionTelemetry.helpers.createCreated(
        "user-123",
        "tier-free",
      );
      trackSubscriptionEvent(created);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("[Subscription Telemetry]"),
        expect.objectContaining({ eventType: "subscription.created" }),
      );

      // User upgrades to pro
      vi.clearAllMocks();
      mockFetch.mockResolvedValue({ ok: true });
      const upgraded = subscriptionTelemetry.helpers.createUpgraded(
        "user-123",
        "tier-pro",
        "tier-free",
      );
      trackSubscriptionEvent(upgraded);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("[Subscription Telemetry]"),
        expect.objectContaining({ eventType: "subscription.upgraded" }),
      );

      // User cancels
      vi.clearAllMocks();
      mockFetch.mockResolvedValue({ ok: true });
      const cancelled = subscriptionTelemetry.helpers.createCancelled(
        "user-123",
        "tier-pro",
      );
      trackSubscriptionEvent(cancelled);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("[Subscription Telemetry]"),
        expect.objectContaining({ eventType: "subscription.cancelled" }),
      );
    });

    it("tracks trial expiration event", () => {
      const mockFetch = fetch as unknown as Mock;
      mockFetch.mockResolvedValue({ ok: true });

      const expired = subscriptionTelemetry.helpers.createExpired(
        "user-456",
        "tier-trial",
        new Date(),
        { reason: "trial_ended", daysActive: 14 },
      );

      const tracked = trackSubscriptionEvent(expired);

      expect(tracked.type).toBe("subscription.expired");
      expect(tracked.metadata?.reason).toBe("trial_ended");
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe("Data consistency", () => {
    it("preserves all event data through tracking", () => {
      const mockFetch = fetch as unknown as Mock;
      mockFetch.mockResolvedValue({ ok: true });

      const event = subscriptionTelemetry.helpers.createUpgraded(
        "user-789",
        "tier-business",
        "tier-pro",
        new Date("2026-01-24T15:30:00Z"),
        { source: "dashboard", adminId: "admin-001" },
      );

      const tracked = trackSubscriptionEvent(event);

      expect(tracked.userId).toBe("user-789");
      expect(tracked.tierId).toBe("tier-business");
      expect(tracked.previousTierId).toBe("tier-pro");
      expect(tracked.metadata?.source).toBe("dashboard");
      expect(tracked.metadata?.adminId).toBe("admin-001");
    });

    it("includes userId, tierId, previousTierId in all events", () => {
      const mockFetch = fetch as unknown as Mock;
      mockFetch.mockResolvedValue({ ok: true });

      const events = [
        subscriptionTelemetry.helpers.createCreated("u1", "t1"),
        subscriptionTelemetry.helpers.createUpgraded("u2", "t2", "t1"),
        subscriptionTelemetry.helpers.createDowngraded("u3", "t1", "t2"),
        subscriptionTelemetry.helpers.createCancelled("u4", "t2"),
        subscriptionTelemetry.helpers.createExpired("u5", "t1"),
      ];

      for (const event of events) {
        expect(event.userId).toBeDefined();
        expect(event.tierId).toBeDefined();
        expect(event.previousTierId !== undefined).toBe(true);
      }
    });
  });
});
