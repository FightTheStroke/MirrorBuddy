/**
 * Tests for video-vision-guard - Pro-only feature access control
 *
 * Test coverage:
 * - canUseVideoVision: returns true only for Pro tier users
 * - canUseVideoVision: returns false for Base tier users
 * - canUseVideoVision: returns false for Trial tier (anonymous users)
 * - requireVideoVision: throws error for non-Pro users
 * - requireVideoVision: allows Pro users without throwing
 */

import { describe, it, expect, vi } from "vitest";
import { canUseVideoVision, requireVideoVision } from "../video-vision-guard";

// Mock TierService
vi.mock("../tier-service", () => ({
  TierService: class MockTierService {
    async checkFeatureAccess(userId: string | null, featureKey: string) {
      // Simulate Pro tier has video_vision, others don't
      if (featureKey === "video_vision") {
        // Only Pro users have video_vision
        if (userId === "pro-user-id") {
          return true;
        }
        return false;
      }
      return false;
    }
  },
}));

describe("video-vision-guard", () => {
  describe("canUseVideoVision", () => {
    it("should return true for Pro tier user", async () => {
      const result = await canUseVideoVision("pro-user-id");
      expect(result).toBe(true);
    });

    it("should return false for Base tier user", async () => {
      const result = await canUseVideoVision("base-user-id");
      expect(result).toBe(false);
    });

    it("should return false for Trial tier user", async () => {
      const result = await canUseVideoVision("trial-user-id");
      expect(result).toBe(false);
    });

    it("should return false for anonymous user (null userId)", async () => {
      const result = await canUseVideoVision(null);
      expect(result).toBe(false);
    });
  });

  describe("requireVideoVision", () => {
    it("should not throw for Pro tier user", async () => {
      await expect(requireVideoVision("pro-user-id")).resolves.toBeUndefined();
    });

    it("should throw error for Base tier user", async () => {
      await expect(requireVideoVision("base-user-id")).rejects.toThrow(
        /upgrade|pro|video/i,
      );
    });

    it("should throw error for Trial tier user", async () => {
      await expect(requireVideoVision("trial-user-id")).rejects.toThrow(
        /upgrade|pro|video/i,
      );
    });

    it("should throw error for anonymous user (null userId)", async () => {
      await expect(requireVideoVision(null)).rejects.toThrow(
        /upgrade|pro|video/i,
      );
    });

    it("should include helpful upgrade message in error", async () => {
      try {
        await requireVideoVision("base-user-id");
        throw new Error("Should have thrown");
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message.toLowerCase()).toMatch(/upgrade|pro|tier|video/);
        }
      }
    });
  });
});
