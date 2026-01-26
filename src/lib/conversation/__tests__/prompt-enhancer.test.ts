/**
 * Tests for system prompt enhancer
 * @module conversation/prompt-enhancer
 */

import { describe, it, expect, vi } from "vitest";
import {
  enhanceSystemPrompt,
  hasMemoryContext,
  extractBasePrompt,
} from "../prompt-enhancer";
import type { ConversationMemory } from "../memory-loader";
import type { TierMemoryLimits } from "../tier-memory-config";

// Mock the safety guardrails
vi.mock("@/lib/safety/safety-prompts", () => ({
  injectSafetyGuardrails: vi.fn((prompt, _options) => `[SAFE] ${prompt}`),
}));

describe("prompt-enhancer", () => {
  const basePrompt = "Sei Melissa, una professoressa di matematica.";
  const safetyOptions = { role: "maestro" as const };

  describe("enhanceSystemPrompt", () => {
    it("returns safe prompt when no memory", () => {
      const emptyMemory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory: emptyMemory,
        safetyOptions,
      });

      expect(result).toBe(
        "[SAFE] Sei Melissa, una professoressa di matematica.",
      );
    });

    it("appends memory section when summary exists", () => {
      const memory: ConversationMemory = {
        recentSummary: "Lo studente ha imparato le frazioni",
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date("2026-01-01"),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Memoria delle Sessioni Precedenti");
      expect(result).toContain("Lo studente ha imparato le frazioni");
    });

    it("includes key facts in memory section", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [
          "preferisce esempi visivi",
          "ha difficoltà con le divisioni",
        ],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Fatti Chiave dello Studente");
      expect(result).toContain("- preferisce esempi visivi");
      expect(result).toContain("- ha difficoltà con le divisioni");
    });

    it("includes topics in memory section", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: ["fatto1"],
        topics: ["matematica", "frazioni", "divisioni"],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Argomenti Già Trattati");
      expect(result).toContain("matematica, frazioni, divisioni");
    });

    it("includes relative date for last session", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const memory: ConversationMemory = {
        recentSummary: "Sessione precedente",
        keyFacts: [],
        topics: [],
        lastSessionDate: yesterday,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Ultimo Incontro (ieri)");
    });

    it("applies safety guardrails first", () => {
      const memory: ConversationMemory = {
        recentSummary: "Summary",
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date(),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toMatch(/^\[SAFE\]/);
    });

    it("includes usage instructions", () => {
      const memory: ConversationMemory = {
        recentSummary: "Summary",
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date(),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("ISTRUZIONI MEMORIA");
      expect(result).toContain("personalizzare l'interazione");
    });
  });

  describe("hasMemoryContext", () => {
    it("returns true when memory section present", () => {
      const prompt = "Base prompt\n\n## Memoria delle Sessioni Precedenti\n...";
      expect(hasMemoryContext(prompt)).toBe(true);
    });

    it("returns false when memory section absent", () => {
      const prompt = "Base prompt without memory";
      expect(hasMemoryContext(prompt)).toBe(false);
    });
  });

  describe("extractBasePrompt", () => {
    it("returns full prompt when no memory section", () => {
      const prompt = "This is the full prompt without memory";
      expect(extractBasePrompt(prompt)).toBe(prompt);
    });

    it("returns base prompt without memory section", () => {
      const prompt =
        "Base prompt\n\n## Memoria delle Sessioni Precedenti\nMemory content";
      expect(extractBasePrompt(prompt)).toBe("Base prompt");
    });

    it("trims whitespace from extracted prompt", () => {
      const prompt =
        "Base prompt   \n\n## Memoria delle Sessioni Precedenti\n...";
      expect(extractBasePrompt(prompt)).toBe("Base prompt");
    });
  });

  describe("tier-aware memory injection", () => {
    it("skips memory injection for Trial tier (0 limits)", () => {
      const trialLimits: TierMemoryLimits = {
        recentConversations: 0,
        timeWindowDays: 0,
        maxKeyFacts: 0,
        maxTopics: 0,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      };

      const memory: ConversationMemory = {
        recentSummary: "Important summary",
        keyFacts: ["fact1", "fact2"],
        topics: ["math", "algebra"],
        lastSessionDate: new Date(),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits: trialLimits,
      });

      // Trial tier should not include memory section even if memory exists
      expect(result).toBe(
        "[SAFE] Sei Melissa, una professoressa di matematica.",
      );
      expect(result).not.toContain("Memoria delle Sessioni Precedenti");
    });

    it("respects maxKeyFacts limit from tier", () => {
      const baseLimits: TierMemoryLimits = {
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 2, // Only allow 2 facts
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      };

      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: ["fact1", "fact2", "fact3", "fact4", "fact5"], // 5 facts provided
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits: baseLimits,
      });

      // Should only include first 2 facts
      expect(result).toContain("fact1");
      expect(result).toContain("fact2");
      expect(result).not.toContain("fact3");
      expect(result).not.toContain("fact4");
      expect(result).not.toContain("fact5");
    });

    it("respects maxTopics limit from tier", () => {
      const baseLimits: TierMemoryLimits = {
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 10,
        maxTopics: 2, // Only allow 2 topics
        semanticEnabled: false,
        crossMaestroEnabled: false,
      };

      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: ["math", "algebra", "geometry", "calculus", "statistics"], // 5 topics
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits: baseLimits,
      });

      // Should only include first 2 topics
      expect(result).toContain("math, algebra");
      expect(result).not.toContain("geometry");
      expect(result).not.toContain("calculus");
      expect(result).not.toContain("statistics");
    });

    it("includes full memory for Pro tier with no limits", () => {
      const proLimits: TierMemoryLimits = {
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      };

      const memory: ConversationMemory = {
        recentSummary: "Summary",
        keyFacts: ["fact1", "fact2", "fact3"],
        topics: ["math", "algebra", "geometry"],
        lastSessionDate: new Date(),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits: proLimits,
      });

      // Pro tier should include all facts and topics
      expect(result).toContain("fact1");
      expect(result).toContain("fact2");
      expect(result).toContain("fact3");
      expect(result).toContain("math, algebra, geometry");
    });

    it("defaults to including all memory when no tierLimits provided", () => {
      const memory: ConversationMemory = {
        recentSummary: "Summary",
        keyFacts: ["fact1", "fact2"],
        topics: ["math", "algebra"],
        lastSessionDate: new Date(),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        // No tierLimits provided - should include all memory
      });

      expect(result).toContain("Memoria delle Sessioni Precedenti");
      expect(result).toContain("fact1");
      expect(result).toContain("fact2");
      expect(result).toContain("math, algebra");
    });
  });
});
