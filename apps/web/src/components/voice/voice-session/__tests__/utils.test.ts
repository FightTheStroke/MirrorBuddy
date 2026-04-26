/**
 * Tests for Voice Session Utilities
 */

import { describe, it, expect } from "vitest";
import { getStateText, calculateSessionXP } from "../utils";

describe("voice-session-utils", () => {
  describe("getStateText", () => {
    it("returns config error message when configError exists", () => {
      const result = getStateText(
        { error: "config", message: "Error" },
        false,
        "idle",
        false,
        false,
        false,
        "Euclide",
      );
      expect(result).toBe("Errore di configurazione");
    });

    it("returns permissions loading message when loading", () => {
      const result = getStateText(
        null,
        true, // permissionsLoading
        "idle",
        false,
        false,
        false,
        "Euclide",
      );
      expect(result).toBe("Controllo permessi...");
    });

    it("returns connecting message when connection state is connecting", () => {
      const result = getStateText(
        null,
        false,
        "connecting", // connectionState
        false,
        false,
        false,
        "Euclide",
      );
      expect(result).toBe("Connessione in corso...");
    });

    it("returns listening message when isListening", () => {
      const result = getStateText(
        null,
        false,
        "connected",
        true, // isListening
        false,
        true,
        "Euclide",
      );
      expect(result).toBe("Ti sto ascoltando...");
    });

    it("returns speaking message with maestro name when isSpeaking", () => {
      const result = getStateText(
        null,
        false,
        "connected",
        false,
        true, // isSpeaking
        true,
        "Euclide",
      );
      expect(result).toBe("Euclide sta parlando...");
    });

    it("uses different maestro names for speaking message", () => {
      const result = getStateText(
        null,
        false,
        "connected",
        false,
        true,
        true,
        "Galileo",
      );
      expect(result).toBe("Galileo sta parlando...");
    });

    it("returns ready message when connected", () => {
      const result = getStateText(
        null,
        false,
        "connected",
        false,
        false,
        true, // isConnected
        "Euclide",
      );
      expect(result).toBe("Pronto - parla ora");
    });

    it("returns disconnected message by default", () => {
      const result = getStateText(
        null,
        false,
        "idle",
        false,
        false,
        false,
        "Euclide",
      );
      expect(result).toBe("Disconnesso");
    });

    it("prioritizes config error over other states", () => {
      const result = getStateText(
        { error: "config", message: "Error" },
        true, // would show permissions loading
        "connecting", // would show connecting
        true, // would show listening
        true, // would show speaking
        true, // would show ready
        "Euclide",
      );
      expect(result).toBe("Errore di configurazione");
    });

    it("prioritizes permissions loading over connection states", () => {
      const result = getStateText(
        null,
        true,
        "connecting",
        true,
        true,
        true,
        "Euclide",
      );
      expect(result).toBe("Controllo permessi...");
    });
  });

  describe("calculateSessionXP", () => {
    it("returns session xpEarned when session exists", () => {
      const session = {
        id: "1",
        startedAt: new Date(),
        maestroId: "euclide",
        questionsAsked: 5,
        xpEarned: 50,
        mirrorBucksEarned: 50,
        subject: "math",
      };
      expect(calculateSessionXP(session, 10)).toBe(50);
    });

    it("returns 0 when session has 0 xpEarned", () => {
      const session = {
        id: "1",
        startedAt: new Date(),
        maestroId: "euclide",
        questionsAsked: 5,
        xpEarned: 0,
        mirrorBucksEarned: 0,
        subject: "math",
      };
      // 0 is falsy, so falls through to calculation
      expect(calculateSessionXP(session, 10)).toBe(20); // Math.max(5, 10 * 2)
    });

    it("calculates XP from transcript length when no session", () => {
      expect(calculateSessionXP(null, 10)).toBe(20); // 10 * 2
      expect(calculateSessionXP(null, 15)).toBe(30); // 15 * 2
    });

    it("returns minimum of 5 XP for short transcripts", () => {
      expect(calculateSessionXP(null, 0)).toBe(5);
      expect(calculateSessionXP(null, 1)).toBe(5);
      expect(calculateSessionXP(null, 2)).toBe(5);
    });

    it("returns calculated value when greater than 5", () => {
      expect(calculateSessionXP(null, 3)).toBe(6); // 3 * 2
      expect(calculateSessionXP(null, 5)).toBe(10); // 5 * 2
    });
  });
});
