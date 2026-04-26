// ============================================================================
// ADMIN COUNTS PUB/SUB TESTS
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  publishAdminCounts,
  getLatestAdminCounts,
} from "../admin-counts-storage";
import {
  subscribeToAdminCounts,
  broadcastAdminCounts,
  getSubscriberCount,
} from "../admin-counts-subscriber";
import { type AdminCounts } from "../admin-counts-types";

// Mock Redis
vi.mock("../index", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn(),
    publish: vi.fn().mockResolvedValue(0),
  },
  isRedisAvailable: vi.fn().mockReturnValue(true),
}));

describe("Admin Counts Pub/Sub", () => {
  const mockCounts: AdminCounts = {
    pendingInvites: 5,
    totalUsers: 42,
    activeUsers24h: 12,
    systemAlerts: 2,
    timestamp: new Date().toISOString(),
  };

  const unsubscribers: Array<() => void> = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup all subscribers after each test
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers.length = 0;
  });

  describe("publishAdminCounts", () => {
    it("should persist and publish admin counts", async () => {
      const { redis } = await import("../index");

      await publishAdminCounts(mockCounts);

      expect(redis.set).toHaveBeenCalledWith(
        "admin:counts:latest",
        JSON.stringify(mockCounts),
      );
      expect(redis.publish).toHaveBeenCalledWith(
        "admin:counts:update",
        JSON.stringify(mockCounts),
      );
    });
  });

  describe("getLatestAdminCounts", () => {
    it("should retrieve latest counts from Redis", async () => {
      const { redis } = await import("../index");
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(mockCounts),
      );

      const result = await getLatestAdminCounts();

      expect(redis.get).toHaveBeenCalledWith("admin:counts:latest");
      expect(result).toEqual(mockCounts);
    });

    it("should return null when no data exists", async () => {
      const { redis } = await import("../index");
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getLatestAdminCounts();

      expect(result).toBeNull();
    });
  });

  describe("subscribeToAdminCounts", () => {
    it("should subscribe and receive updates", async () => {
      const callback = vi.fn();
      const unsubscribe = await subscribeToAdminCounts(callback);

      expect(getSubscriberCount()).toBe(1);

      // Broadcast an update
      broadcastAdminCounts(mockCounts);

      expect(callback).toHaveBeenCalledWith(mockCounts);

      // Cleanup
      unsubscribe();
      expect(getSubscriberCount()).toBe(0);
    });

    it("should support multiple subscribers", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      const unsub1 = await subscribeToAdminCounts(callback1);
      const unsub2 = await subscribeToAdminCounts(callback2);
      const unsub3 = await subscribeToAdminCounts(callback3);

      expect(getSubscriberCount()).toBe(3);

      // Broadcast to all
      broadcastAdminCounts(mockCounts);

      expect(callback1).toHaveBeenCalledWith(mockCounts);
      expect(callback2).toHaveBeenCalledWith(mockCounts);
      expect(callback3).toHaveBeenCalledWith(mockCounts);

      // Cleanup all
      unsub1();
      unsub2();
      unsub3();
      expect(getSubscriberCount()).toBe(0);
    });

    it("should cleanup when last subscriber unsubscribes", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = await subscribeToAdminCounts(callback1);
      const unsub2 = await subscribeToAdminCounts(callback2);

      expect(getSubscriberCount()).toBe(2);

      unsub1();
      expect(getSubscriberCount()).toBe(1);

      unsub2();
      expect(getSubscriberCount()).toBe(0);
    });
  });

  describe("broadcastAdminCounts", () => {
    it("should emit updates to all subscribers", async () => {
      const callback = vi.fn();
      const unsub = await subscribeToAdminCounts(callback);
      unsubscribers.push(unsub);

      broadcastAdminCounts(mockCounts);

      expect(callback).toHaveBeenCalledWith(mockCounts);
    });
  });

  describe("singleton behavior", () => {
    it("should maintain same subscriber count across calls", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = await subscribeToAdminCounts(callback1);
      unsubscribers.push(unsub1);
      expect(getSubscriberCount()).toBe(1);

      const unsub2 = await subscribeToAdminCounts(callback2);
      unsubscribers.push(unsub2);
      expect(getSubscriberCount()).toBe(2);
    });
  });
});
