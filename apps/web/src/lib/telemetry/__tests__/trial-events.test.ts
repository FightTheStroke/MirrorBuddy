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
  trackTrialVoice,
  trackTrialTool,
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

  describe("trackTrialVoice", () => {
    it("tracks voice session with duration and remaining", () => {
      trackTrialVoice("visitor-123", 60, 240);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "conversation",
        "trial_voice",
        "visitor-123",
        60,
        {
          remainingSeconds: 240,
          progressPercent: 20,
        },
      );
    });

    it("calculates progress percentage correctly at limit", () => {
      trackTrialVoice("visitor-123", 300, 0);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "conversation",
        "trial_voice",
        "visitor-123",
        300,
        {
          remainingSeconds: 0,
          progressPercent: 100,
        },
      );
    });

    it("does not track when consent not given", () => {
      vi.mocked(hasAnalyticsConsent).mockReturnValue(false);

      trackTrialVoice("visitor-123", 60, 240);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe("trackTrialTool", () => {
    it("tracks tool usage with name and counts", () => {
      trackTrialTool("visitor-123", "mindmap", 3, 7);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "conversation",
        "trial_tool",
        "mindmap",
        3,
        {
          visitorId: "visitor-123",
          remainingTools: 7,
          progressPercent: 30,
        },
      );
    });

    it("tracks different tool types", () => {
      const tools = ["mindmap", "summary", "flashcard", "quiz"];

      for (const tool of tools) {
        vi.clearAllMocks();
        trackTrialTool("visitor-123", tool, 1, 9);

        expect(mockTrackEvent).toHaveBeenCalledWith(
          "conversation",
          "trial_tool",
          tool,
          1,
          expect.objectContaining({ remainingTools: 9 }),
        );
      }
    });

    it("calculates progress percentage correctly at limit", () => {
      trackTrialTool("visitor-123", "quiz", 10, 0);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "conversation",
        "trial_tool",
        "quiz",
        10,
        {
          visitorId: "visitor-123",
          remainingTools: 0,
          progressPercent: 100,
        },
      );
    });

    it("does not track when consent not given", () => {
      vi.mocked(hasAnalyticsConsent).mockReturnValue(false);

      trackTrialTool("visitor-123", "mindmap", 1, 9);

      expect(mockTrackEvent).not.toHaveBeenCalled();
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
