/**
 * MIRRORBUDDY - Trial Events Telemetry Tests
 *
 * Unit tests for trial mode telemetry events.
 *
 * Plan 052: Trial mode telemetry
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock consent storage before importing trial-events
vi.mock("@/lib/consent/consent-storage", () => ({
  hasAnalyticsConsent: vi.fn(() => true),
}));

// Mock telemetry store
const mockTrackEvent = vi.fn();
vi.mock("../telemetry-store", () => ({
  useTelemetryStore: {
    getState: () => ({
      trackEvent: mockTrackEvent,
    }),
  },
}));

import {
  trackTrialStart,
  trackTrialChat,
  trackTrialLimitHit,
  trackFeatureAttempted,
  trackBetaCtaShown,
  trackBetaCtaClicked,
  trackBudgetExhausted,
  getSessionAttributes,
} from "../trial-events";
import { hasAnalyticsConsent } from "@/lib/consent/consent-storage";

describe("Trial Events Telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasAnalyticsConsent).mockReturnValue(true);
  });

  describe("trackTrialStart", () => {
    it("tracks trial start with visitor ID", () => {
      trackTrialStart("visitor-123");

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "navigation",
        "trial_start",
        "visitor-123",
        undefined,
        expect.objectContaining({
          deviceType: expect.any(String),
          browser: expect.any(String),
        }),
      );
    });

    it("does not track when consent not given", () => {
      vi.mocked(hasAnalyticsConsent).mockReturnValue(false);

      trackTrialStart("visitor-123");

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe("trackTrialChat", () => {
    it("tracks chat with count and remaining", () => {
      trackTrialChat("visitor-123", 5, 5);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "conversation",
        "trial_chat",
        "visitor-123",
        5,
        {
          remainingChats: 5,
          progressPercent: 50,
        },
      );
    });

    it("calculates progress percentage correctly", () => {
      trackTrialChat("visitor-123", 10, 0);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "conversation",
        "trial_chat",
        "visitor-123",
        10,
        {
          remainingChats: 0,
          progressPercent: 100,
        },
      );
    });
  });

  describe("trackTrialLimitHit", () => {
    it("tracks limit hit with type", () => {
      trackTrialLimitHit("visitor-123", "chat");

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "navigation",
        "trial_limit_hit",
        "visitor-123",
        undefined,
        { limitType: "chat" },
      );
    });

    it("tracks different limit types", () => {
      const limitTypes = [
        "chat",
        "document",
        "maestro",
        "coach",
        "tool",
      ] as const;

      for (const limitType of limitTypes) {
        vi.clearAllMocks();
        trackTrialLimitHit("visitor-123", limitType);

        expect(mockTrackEvent).toHaveBeenCalledWith(
          "navigation",
          "trial_limit_hit",
          "visitor-123",
          undefined,
          { limitType },
        );
      }
    });
  });

  describe("trackFeatureAttempted", () => {
    it("tracks blocked feature attempt", () => {
      trackFeatureAttempted("visitor-123", "flashcards", true);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "navigation",
        "feature_attempted",
        "flashcards",
        undefined,
        { visitorId: "visitor-123", wasBlocked: true },
      );
    });

    it("tracks allowed feature attempt", () => {
      trackFeatureAttempted("visitor-123", "mindmap", false);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "navigation",
        "feature_attempted",
        "mindmap",
        undefined,
        { visitorId: "visitor-123", wasBlocked: false },
      );
    });
  });

  describe("trackBetaCtaShown", () => {
    it("tracks CTA shown with location", () => {
      trackBetaCtaShown("visitor-123", "limit_modal");

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "navigation",
        "beta_cta_shown",
        "limit_modal",
        undefined,
        { visitorId: "visitor-123" },
      );
    });
  });

  describe("trackBetaCtaClicked", () => {
    it("tracks CTA clicked with location", () => {
      trackBetaCtaClicked("visitor-123", "sidebar");

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "navigation",
        "beta_cta_clicked",
        "sidebar",
        undefined,
        { visitorId: "visitor-123" },
      );
    });
  });

  describe("trackBudgetExhausted", () => {
    it("tracks global cap exhaustion", () => {
      trackBudgetExhausted("global_cap");

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "error",
        "budget_exhausted",
        "global_cap",
        undefined,
        {},
      );
    });

    it("tracks abuse detection", () => {
      trackBudgetExhausted("abuse_detected");

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "error",
        "budget_exhausted",
        "abuse_detected",
        undefined,
        {},
      );
    });
  });

  describe("getSessionAttributes", () => {
    it("returns device type and browser", () => {
      const attrs = getSessionAttributes();

      expect(attrs).toHaveProperty("deviceType");
      expect(attrs).toHaveProperty("browser");
      expect(["mobile", "tablet", "desktop"]).toContain(attrs.deviceType);
    });
  });
});
