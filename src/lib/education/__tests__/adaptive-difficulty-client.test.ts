/**
 * Unit tests for Adaptive Difficulty Client functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock csrfFetch before importing the module
const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth/csrf-client", () => ({
  csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
}));

// Mock logger
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
  buildSignalsFromText,
  sendAdaptiveSignals,
} from "../adaptive-difficulty-client";

describe("adaptive-difficulty-client", () => {
  beforeEach(() => {
    mockCsrfFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("buildSignalsFromText", () => {
    it("returns empty array for empty text", () => {
      expect(buildSignalsFromText("", "chat")).toEqual([]);
      expect(buildSignalsFromText("", "voice", "math")).toEqual([]);
    });

    it("detects question patterns", () => {
      const signals1 = buildSignalsFromText(
        "Perché il cielo è blu?",
        "chat",
        "science",
      );
      expect(signals1).toContainEqual(
        expect.objectContaining({
          type: "question",
          source: "chat",
          subject: "science",
        }),
      );

      const signals2 = buildSignalsFromText("Come funziona?", "voice");
      expect(signals2).toContainEqual(
        expect.objectContaining({ type: "question", source: "voice" }),
      );

      const signals3 = buildSignalsFromText("Quando è successo", "chat");
      expect(signals3).toContainEqual(
        expect.objectContaining({ type: "question" }),
      );
    });

    it("detects question mark", () => {
      const signals = buildSignalsFromText("Davvero?", "chat");
      expect(signals).toContainEqual(
        expect.objectContaining({ type: "question" }),
      );
    });

    it("detects repeat request patterns", () => {
      const tests = [
        "Non ho capito",
        "Puoi ripetere per favore", // without ? to avoid question signal
        "Di nuovo per favore",
        "Puoi spiegare ancora",
        "Non mi è chiaro",
        "non mi e chiaro", // without accent
        "Non capisco",
      ];

      for (const text of tests) {
        const signals = buildSignalsFromText(text, "voice", "math");
        expect(signals).toContainEqual(
          expect.objectContaining({ type: "repeat_request" }),
        );
      }
    });

    it("detects frustration patterns", () => {
      const tests = [
        "Non ce la faccio più",
        "Sono frustrato",
        "Mi stresso troppo",
        "Odio la matematica",
        "Non ci riesco",
        "È troppo difficile",
        "e troppo difficile", // without accent
        "Non ne posso più",
      ];

      for (const text of tests) {
        const signals = buildSignalsFromText(text, "chat", "math");
        expect(signals).toContainEqual(
          expect.objectContaining({ type: "frustration", value: 0.8 }),
        );
      }
    });

    it("detects multiple signals from same text", () => {
      const text = "Non ho capito, perché è così difficile? Non ce la faccio!";
      const signals = buildSignalsFromText(text, "voice", "physics");

      expect(signals.length).toBeGreaterThanOrEqual(3);
      expect(signals).toContainEqual(
        expect.objectContaining({ type: "question" }),
      );
      expect(signals).toContainEqual(
        expect.objectContaining({ type: "repeat_request" }),
      );
      expect(signals).toContainEqual(
        expect.objectContaining({ type: "frustration" }),
      );
    });

    it("includes subject and topic in signals", () => {
      const signals = buildSignalsFromText(
        "Perché?",
        "chat",
        "math",
        "algebra",
      );

      expect(signals[0]).toMatchObject({
        type: "question",
        source: "chat",
        subject: "math",
        topic: "algebra",
      });
    });
  });

  describe("sendAdaptiveSignals", () => {
    it("returns true for empty signals array", async () => {
      const result = await sendAdaptiveSignals([]);
      expect(result).toBe(true);
      expect(mockCsrfFetch).not.toHaveBeenCalled();
    });

    it("sends signals to API and returns true on success", async () => {
      mockCsrfFetch.mockResolvedValueOnce({ ok: true });

      const signals = [{ type: "question" as const, source: "chat" as const }];
      const result = await sendAdaptiveSignals(signals);

      expect(result).toBe(true);
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/adaptive/signals",
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        }),
      );
    });

    it("returns false on 4xx client error without retry", async () => {
      mockCsrfFetch.mockResolvedValueOnce({ ok: false, status: 400 });

      const signals = [{ type: "question" as const, source: "chat" as const }];
      const result = await sendAdaptiveSignals(signals, { retries: 2 });

      expect(result).toBe(false);
      expect(mockCsrfFetch).toHaveBeenCalledTimes(1); // No retries for 4xx
    });

    it("retries on 5xx server error", async () => {
      mockCsrfFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true });

      const signals = [{ type: "question" as const, source: "chat" as const }];
      const result = await sendAdaptiveSignals(signals, { retries: 2 });

      expect(result).toBe(true);
      expect(mockCsrfFetch).toHaveBeenCalledTimes(2);
    });

    it("retries on network error", async () => {
      mockCsrfFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ ok: true });

      const signals = [{ type: "question" as const, source: "chat" as const }];
      const result = await sendAdaptiveSignals(signals, { retries: 2 });

      expect(result).toBe(true);
      expect(mockCsrfFetch).toHaveBeenCalledTimes(2);
    });

    it("returns false after max retries exhausted", async () => {
      mockCsrfFetch.mockRejectedValue(new Error("Network error"));

      const signals = [{ type: "question" as const, source: "chat" as const }];
      const result = await sendAdaptiveSignals(signals, { retries: 1 });

      expect(result).toBe(false);
      expect(mockCsrfFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });
});
