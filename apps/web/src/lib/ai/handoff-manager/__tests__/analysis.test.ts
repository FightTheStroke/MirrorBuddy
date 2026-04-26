/**
 * Tests for Handoff Analysis
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the intent detection module
vi.mock("../intent-detection", () => ({
  detectIntent: vi.fn(),
}));

describe("handoff-analysis", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("mightNeedHandoff", () => {
    it("returns true for crisis messages", async () => {
      const { detectIntent } = await import("../intent-detection");
      vi.mocked(detectIntent).mockReturnValue({
        type: "crisis",
        confidence: 0.85,
      });

      const { mightNeedHandoff } = await import("../analysis");
      const result = mightNeedHandoff("mi sento molto solo");

      expect(result).toBe(true);
    });

    it("returns true for emotional_support intent", async () => {
      const { detectIntent } = await import("../intent-detection");
      vi.mocked(detectIntent).mockReturnValue({
        type: "emotional_support",
        confidence: 0.8,
      });

      const { mightNeedHandoff } = await import("../analysis");
      const result = mightNeedHandoff("sono preoccupato per l'esame");

      expect(result).toBe(true);
    });

    it("returns true when subject is detected with high confidence", async () => {
      const { detectIntent } = await import("../intent-detection");
      vi.mocked(detectIntent).mockReturnValue({
        type: "academic_help",
        confidence: 0.85,
        subject: "mathematics",
      });

      const { mightNeedHandoff } = await import("../analysis");
      const result = mightNeedHandoff("aiutami con la matematica");

      expect(result).toBe(true);
    });

    it("returns false for low confidence intents", async () => {
      const { detectIntent } = await import("../intent-detection");
      vi.mocked(detectIntent).mockReturnValue({
        type: "general_chat",
        confidence: 0.4,
      });

      const { mightNeedHandoff } = await import("../analysis");
      const result = mightNeedHandoff("ciao come stai");

      expect(result).toBe(false);
    });

    it("returns false for tool requests", async () => {
      const { detectIntent } = await import("../intent-detection");
      vi.mocked(detectIntent).mockReturnValue({
        type: "tool_request",
        confidence: 0.9,
      });

      const { mightNeedHandoff } = await import("../analysis");
      const result = mightNeedHandoff("crea una mappa mentale");

      expect(result).toBe(false);
    });

    it("returns false for general chat without subject", async () => {
      const { detectIntent } = await import("../intent-detection");
      vi.mocked(detectIntent).mockReturnValue({
        type: "general_chat",
        confidence: 0.8,
      });

      const { mightNeedHandoff } = await import("../analysis");
      const result = mightNeedHandoff("che giorno è oggi");

      expect(result).toBe(false);
    });
  });
});
