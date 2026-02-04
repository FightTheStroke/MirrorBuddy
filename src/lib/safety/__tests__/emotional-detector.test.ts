/**
 * Emotional Detector Tests
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * ADR 0115 - Amodei Safety Enhancements
 */

import { describe, it, expect } from "vitest";
import {
  detectEmotionalVenting,
  detectAIPreference,
  analyzeMessage,
  analyzeMessages,
} from "../dependency/emotional-detector";

describe("emotional-detector", () => {
  describe("detectEmotionalVenting", () => {
    it("should detect Italian loneliness patterns", () => {
      expect(detectEmotionalVenting("mi sento solo")).toBe(true);
      expect(detectEmotionalVenting("Mi sento solo oggi")).toBe(true);
      expect(detectEmotionalVenting("nessuno mi capisce")).toBe(true);
      expect(detectEmotionalVenting("non ho amici")).toBe(true);
      expect(detectEmotionalVenting("sono sempre solo")).toBe(true);
    });

    it("should detect Italian emotional distress patterns", () => {
      expect(detectEmotionalVenting("sono frustrato")).toBe(true);
      expect(detectEmotionalVenting("sono frustrata")).toBe(true);
      expect(detectEmotionalVenting("non ce la faccio")).toBe(true);
      expect(detectEmotionalVenting("ho paura")).toBe(true);
      expect(detectEmotionalVenting("sono triste")).toBe(true);
    });

    it("should detect English emotional patterns", () => {
      expect(detectEmotionalVenting("i feel lonely")).toBe(true);
      expect(detectEmotionalVenting("I feel lonely today")).toBe(true);
      expect(detectEmotionalVenting("nobody understands me")).toBe(true);
      expect(detectEmotionalVenting("i'm frustrated")).toBe(true);
      expect(detectEmotionalVenting("i'm anxious")).toBe(true);
      expect(detectEmotionalVenting("i'm sad")).toBe(true);
    });

    it("should return false for neutral messages", () => {
      expect(detectEmotionalVenting("Aiutami con i compiti")).toBe(false);
      expect(detectEmotionalVenting("Cos'è la fotosintesi?")).toBe(false);
      expect(detectEmotionalVenting("Help me with math")).toBe(false);
      expect(detectEmotionalVenting("What is 2+2?")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(detectEmotionalVenting("MI SENTO SOLO")).toBe(true);
      expect(detectEmotionalVenting("I FEEL LONELY")).toBe(true);
    });
  });

  describe("detectAIPreference", () => {
    it("should detect Italian AI preference patterns", () => {
      expect(detectAIPreference("preferisco parlare con te")).toBe(true);
      expect(detectAIPreference("sei l'unico che mi capisce")).toBe(true);
      expect(detectAIPreference("non voglio parlare con persone reali")).toBe(
        true,
      );
      expect(detectAIPreference("tu sei meglio dei miei amici")).toBe(true);
      expect(detectAIPreference("tu sei meglio dei miei genitori")).toBe(true);
    });

    it("should detect English AI preference patterns", () => {
      expect(detectAIPreference("i prefer talking to you")).toBe(true);
      expect(detectAIPreference("you're the only one who understands")).toBe(
        true,
      );
      expect(detectAIPreference("you're better than my friends")).toBe(true);
    });

    it("should return false for neutral messages", () => {
      expect(detectAIPreference("Grazie per l'aiuto")).toBe(false);
      expect(detectAIPreference("Thanks for helping")).toBe(false);
      expect(detectAIPreference("Sei molto utile")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(detectAIPreference("PREFERISCO PARLARE CON TE")).toBe(true);
      expect(detectAIPreference("I PREFER TALKING TO YOU")).toBe(true);
    });
  });

  describe("analyzeMessage", () => {
    it("should detect only emotional venting", () => {
      const result = analyzeMessage("mi sento solo oggi");
      expect(result.hasEmotionalVenting).toBe(true);
      expect(result.hasAIPreference).toBe(false);
      expect(result.emotionalPatterns.length).toBeGreaterThan(0);
      expect(result.preferencePatterns).toHaveLength(0);
    });

    it("should detect only AI preference", () => {
      const result = analyzeMessage("preferisco parlare con te");
      expect(result.hasEmotionalVenting).toBe(false);
      expect(result.hasAIPreference).toBe(true);
      expect(result.emotionalPatterns).toHaveLength(0);
      expect(result.preferencePatterns.length).toBeGreaterThan(0);
    });

    it("should detect both patterns in same message", () => {
      const result = analyzeMessage("mi sento solo, preferisco parlare con te");
      expect(result.hasEmotionalVenting).toBe(true);
      expect(result.hasAIPreference).toBe(true);
    });

    it("should return clean result for neutral message", () => {
      const result = analyzeMessage("Aiutami con la matematica");
      expect(result.hasEmotionalVenting).toBe(false);
      expect(result.hasAIPreference).toBe(false);
      expect(result.emotionalPatterns).toHaveLength(0);
      expect(result.preferencePatterns).toHaveLength(0);
    });
  });

  describe("analyzeMessages", () => {
    it("should count emotional vents across messages", () => {
      const messages = [
        "mi sento solo",
        "aiutami con i compiti",
        "sono triste oggi",
        "cos'è la fotosintesi?",
      ];
      const result = analyzeMessages(messages);

      expect(result.totalEmotionalVents).toBe(2);
      expect(result.totalAIPreferences).toBe(0);
      expect(result.details).toHaveLength(4);
    });

    it("should count AI preferences across messages", () => {
      const messages = [
        "ciao",
        "preferisco parlare con te",
        "tu sei meglio dei miei amici",
      ];
      const result = analyzeMessages(messages);

      expect(result.totalEmotionalVents).toBe(0);
      expect(result.totalAIPreferences).toBe(2);
    });

    it("should handle empty array", () => {
      const result = analyzeMessages([]);
      expect(result.totalEmotionalVents).toBe(0);
      expect(result.totalAIPreferences).toBe(0);
      expect(result.details).toHaveLength(0);
    });
  });
});
