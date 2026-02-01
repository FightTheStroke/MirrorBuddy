/**
 * Unit tests for cost-tracking-service
 *
 * Tests verify cost calculations are based on documented pricing.
 * SOURCE: docs/busplan/VoiceCostAnalysis-2026-01-02.md
 */

import { describe, it, expect, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    sessionMetrics: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import {
  calculateCost,
  checkSessionCost,
  PRICING,
  THRESHOLDS,
} from "../cost-tracking-service";

describe("cost-tracking-service", () => {
  describe("PRICING constants", () => {
    it("has documented text pricing (€0.002/1K tokens)", () => {
      expect(PRICING.TEXT_PER_1K_TOKENS).toBe(0.002);
    });

    it("has documented voice pricing (€0.04/min)", () => {
      expect(PRICING.VOICE_REALTIME_PER_MIN).toBe(0.04);
    });

    it("has embeddings pricing", () => {
      expect(PRICING.EMBEDDINGS_PER_1K_TOKENS).toBe(0.00002);
    });
  });

  describe("THRESHOLDS", () => {
    it("has session text limits from V1Plan", () => {
      expect(THRESHOLDS.SESSION_TEXT_WARN).toBe(0.05);
      expect(THRESHOLDS.SESSION_TEXT_LIMIT).toBe(0.1);
    });

    it("has session voice limits from V1Plan", () => {
      expect(THRESHOLDS.SESSION_VOICE_WARN).toBe(0.15);
      expect(THRESHOLDS.SESSION_VOICE_LIMIT).toBe(0.3);
    });

    it("has daily user limit", () => {
      expect(THRESHOLDS.DAILY_USER_LIMIT).toBe(5.0);
    });
  });

  describe("calculateCost", () => {
    it("calculates text cost correctly", () => {
      const result = calculateCost({
        tokensIn: 500,
        tokensOut: 500,
      });

      // 1000 tokens = €0.002
      expect(result.textCost).toBe(0.002);
      expect(result.totalCost).toBe(0.002);
    });

    it("calculates voice cost correctly", () => {
      const result = calculateCost({
        voiceMinutes: 5,
      });

      // 5 minutes * €0.04 = €0.20
      expect(result.voiceCost).toBe(0.2);
      expect(result.totalCost).toBe(0.2);
    });

    it("calculates combined costs correctly", () => {
      const result = calculateCost({
        tokensIn: 1000,
        tokensOut: 1000,
        voiceMinutes: 2.5,
      });

      // 2000 tokens = €0.004
      // 2.5 minutes = €0.10
      // Total = €0.104
      expect(result.textCost).toBe(0.004);
      expect(result.voiceCost).toBe(0.1);
      expect(result.totalCost).toBe(0.104);
    });

    it("handles zero usage", () => {
      const result = calculateCost({});

      expect(result.textCost).toBe(0);
      expect(result.voiceCost).toBe(0);
      expect(result.embeddingsCost).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it("rounds to 3 decimal places", () => {
      const result = calculateCost({
        tokensIn: 333,
        tokensOut: 333,
      });

      // 666 tokens = €0.001332 -> rounded to €0.001
      expect(result.textCost).toBe(0.001);
    });
  });

  describe("checkSessionCost", () => {
    it("returns ok for low text costs", () => {
      const result = checkSessionCost(0.03, false);
      expect(result.status).toBe("ok");
    });

    it("returns warning when approaching text limit", () => {
      const result = checkSessionCost(0.07, false);
      expect(result.status).toBe("warning");
    });

    it("returns exceeded when over text limit", () => {
      const result = checkSessionCost(0.12, false);
      expect(result.status).toBe("exceeded");
    });

    it("uses voice thresholds when hasVoice is true", () => {
      // €0.10 is warning for text but ok for voice
      const result = checkSessionCost(0.1, true);
      expect(result.status).toBe("ok");

      // €0.20 is exceeded for text but warning for voice
      const result2 = checkSessionCost(0.2, true);
      expect(result2.status).toBe("warning");
    });
  });
});
