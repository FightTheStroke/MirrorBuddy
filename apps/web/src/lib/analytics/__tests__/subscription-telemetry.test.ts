/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {
  trackSubscriptionEvent,
  type SubscriptionEvent,
  type SubscriptionEventType,
  emitSubscriptionEventToApi,
} from "../subscription-telemetry";
import { logger } from "@/lib/logger";

// Mock the logger and fetch
vi.mock("@/lib/logger");
vi.stubGlobal("fetch", vi.fn());

describe("Subscription Telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trackSubscriptionEvent", () => {
    it("creates a subscription.created event with correct properties", () => {
      const event: SubscriptionEvent = {
        type: "subscription.created",
        userId: "user-123",
        tierId: "tier-free",
        previousTierId: null,
        timestamp: new Date("2026-01-24T10:00:00Z"),
        metadata: {
          subscriptionId: "sub-123",
          status: "ACTIVE",
        },
      };

      const tracked = trackSubscriptionEvent(event);

      expect(tracked).toBeDefined();
      expect(tracked.type).toBe("subscription.created");
      expect(tracked.userId).toBe("user-123");
      expect(tracked.tierId).toBe("tier-free");
      expect(tracked.previousTierId).toBeNull();
      expect(tracked.timestamp).toEqual(new Date("2026-01-24T10:00:00Z"));
    });

    it("creates a subscription.upgraded event when moving to higher tier", () => {
      const event: SubscriptionEvent = {
        type: "subscription.upgraded",
        userId: "user-123",
        tierId: "tier-pro",
        previousTierId: "tier-free",
        timestamp: new Date("2026-01-24T11:00:00Z"),
        metadata: {
          subscriptionId: "sub-123",
          status: "ACTIVE",
        },
      };

      const tracked = trackSubscriptionEvent(event);

      expect(tracked.type).toBe("subscription.upgraded");
      expect(tracked.previousTierId).toBe("tier-free");
      expect(tracked.tierId).toBe("tier-pro");
    });

    it("creates a subscription.downgraded event", () => {
      const event: SubscriptionEvent = {
        type: "subscription.downgraded",
        userId: "user-123",
        tierId: "tier-free",
        previousTierId: "tier-pro",
        timestamp: new Date("2026-01-24T12:00:00Z"),
        metadata: {
          subscriptionId: "sub-123",
          status: "ACTIVE",
        },
      };

      const tracked = trackSubscriptionEvent(event);

      expect(tracked.type).toBe("subscription.downgraded");
      expect(tracked.previousTierId).toBe("tier-pro");
      expect(tracked.tierId).toBe("tier-free");
    });

    it("creates a subscription.cancelled event", () => {
      const event: SubscriptionEvent = {
        type: "subscription.cancelled",
        userId: "user-123",
        tierId: "tier-pro",
        previousTierId: null,
        timestamp: new Date("2026-01-24T13:00:00Z"),
        metadata: {
          subscriptionId: "sub-123",
          status: "CANCELLED",
          reason: "user_request",
        },
      };

      const tracked = trackSubscriptionEvent(event);

      expect(tracked.type).toBe("subscription.cancelled");
      expect(tracked.metadata?.reason).toBe("user_request");
    });

    it("creates a subscription.expired event", () => {
      const event: SubscriptionEvent = {
        type: "subscription.expired",
        userId: "user-123",
        tierId: "tier-pro",
        previousTierId: null,
        timestamp: new Date("2026-01-24T14:00:00Z"),
        metadata: {
          subscriptionId: "sub-123",
          status: "EXPIRED",
        },
      };

      const tracked = trackSubscriptionEvent(event);

      expect(tracked.type).toBe("subscription.expired");
      expect(tracked.metadata?.status).toBe("EXPIRED");
    });

    it("logs event at info level", () => {
      const event: SubscriptionEvent = {
        type: "subscription.created",
        userId: "user-123",
        tierId: "tier-free",
        previousTierId: null,
        timestamp: new Date(),
        metadata: {},
      };

      trackSubscriptionEvent(event);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("[Subscription Telemetry]"),
        expect.objectContaining({
          eventType: "subscription.created",
          userId: "user-123",
        }),
      );
    });

    it("sets timestamp to now if not provided", () => {
      const beforeTime = new Date();
      const event: SubscriptionEvent = {
        type: "subscription.created",
        userId: "user-123",
        tierId: "tier-free",
        previousTierId: null,
        timestamp: undefined,
        metadata: {},
      };

      const tracked = trackSubscriptionEvent(event);
      const afterTime = new Date();

      expect(tracked.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(tracked.timestamp.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });
  });

  describe("emitSubscriptionEventToApi", () => {
    const mockFetch = fetch as unknown as Mock;

    it("sends event to /api/metrics/subscription-events endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      const event: SubscriptionEvent = {
        type: "subscription.created",
        userId: "user-123",
        tierId: "tier-free",
        previousTierId: null,
        timestamp: new Date("2026-01-24T10:00:00Z"),
        metadata: {},
      };

      await emitSubscriptionEventToApi(event);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/metrics/subscription-events",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("subscription.created"),
        }),
      );
    });

    it("includes all required fields in API payload", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      const event: SubscriptionEvent = {
        type: "subscription.upgraded",
        userId: "user-123",
        tierId: "tier-pro",
        previousTierId: "tier-free",
        timestamp: new Date("2026-01-24T11:00:00Z"),
        metadata: { subscriptionId: "sub-123" },
      };

      await emitSubscriptionEventToApi(event);

      const callArgs = (mockFetch as Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.type).toBe("subscription.upgraded");
      expect(body.userId).toBe("user-123");
      expect(body.tierId).toBe("tier-pro");
      expect(body.previousTierId).toBe("tier-free");
      expect(body.timestamp).toBeDefined();
    });

    it("handles API errors gracefully without throwing", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const event: SubscriptionEvent = {
        type: "subscription.created",
        userId: "user-123",
        tierId: "tier-free",
        previousTierId: null,
        timestamp: new Date(),
        metadata: {},
      };

      // Should not throw
      await expect(emitSubscriptionEventToApi(event)).resolves.not.toThrow();
    });

    it("logs debug message on successful emission", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
      });

      const event: SubscriptionEvent = {
        type: "subscription.created",
        userId: "user-123",
        tierId: "tier-free",
        previousTierId: null,
        timestamp: new Date(),
        metadata: {},
      };

      await emitSubscriptionEventToApi(event);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("[Subscription Telemetry]"),
        expect.anything(),
      );
    });

    it("logs error when API emission fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API error"));

      const event: SubscriptionEvent = {
        type: "subscription.cancelled",
        userId: "user-123",
        tierId: "tier-pro",
        previousTierId: null,
        timestamp: new Date(),
        metadata: {},
      };

      await emitSubscriptionEventToApi(event);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("[Subscription Telemetry]"),
        expect.anything(),
        expect.any(Error),
      );
    });
  });

  describe("Event Type Support", () => {
    it("supports all required event types", () => {
      const eventTypes: SubscriptionEventType[] = [
        "subscription.created",
        "subscription.upgraded",
        "subscription.downgraded",
        "subscription.cancelled",
        "subscription.expired",
      ];

      for (const eventType of eventTypes) {
        const event: SubscriptionEvent = {
          type: eventType,
          userId: "user-123",
          tierId: "tier-free",
          previousTierId: null,
          timestamp: new Date(),
          metadata: {},
        };

        expect(() => trackSubscriptionEvent(event)).not.toThrow();
      }
    });
  });
});
