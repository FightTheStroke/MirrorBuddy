/**
 * Memory Integration Tests
 * Task 9.03: Test conversational memory flow end-to-end
 *
 * Tests ADR 0021 implementation
 */

import { describe, it, expect } from "vitest";
import {
  enhanceSystemPrompt,
  hasMemoryContext,
  extractBasePrompt,
} from "../prompt-enhancer";
import { formatRelativeDate, type ConversationMemory } from "../memory-loader";
import { hasSafetyGuardrails } from "@/lib/safety/safety-prompts";

describe("Memory Integration Flow", () => {
  describe("Full Memory Pipeline", () => {
    it("should enhance prompt with memory and safety", () => {
      // Step 1: Create mock memory
      const mockMemory: ConversationMemory = {
        recentSummary: "Discussione su equazioni di secondo grado",
        keyFacts: [
          "Studente ha difficoltà con frazioni",
          "Preferisce esempi visivi",
        ],
        topics: ["matematica", "equazioni", "algebra"],
        lastSessionDate: new Date(),
      };

      // Step 2: Enhance system prompt with memory
      const basePrompt = "Sei Archimede, il matematico.";
      const enhancedPrompt = enhanceSystemPrompt({
        basePrompt,
        memory: mockMemory,
        safetyOptions: { role: "maestro" },
      });

      // Step 3: Verify safety guardrails are present
      expect(hasSafetyGuardrails(enhancedPrompt)).toBe(true);

      // Step 4: Verify memory context is included
      expect(enhancedPrompt).toContain("equazioni");
      expect(hasMemoryContext(enhancedPrompt)).toBe(true);
    });

    it("should handle empty memory gracefully", () => {
      const emptyMemory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      // Enhancement should still work with empty context
      const enhanced = enhanceSystemPrompt({
        basePrompt: "Sei Galileo.",
        memory: emptyMemory,
        safetyOptions: { role: "maestro" },
      });
      expect(hasSafetyGuardrails(enhanced)).toBe(true);
      expect(hasMemoryContext(enhanced)).toBe(false);
    });
  });

  describe("Prompt Enhancement with Memory", () => {
    it("should include key facts in enhanced prompt", () => {
      const memory: ConversationMemory = {
        recentSummary: "Studente ha difficoltà con frazioni",
        keyFacts: [
          "Ha completato esercizi su percentuali",
          "Preferisce approccio visivo",
        ],
        topics: ["matematica"],
        lastSessionDate: new Date(),
      };

      const enhanced = enhanceSystemPrompt({
        basePrompt: "Sei Archimede.",
        memory,
        safetyOptions: { role: "maestro" },
      });

      expect(enhanced).toContain("frazioni");
      expect(enhanced).toContain("percentuali");
    });

    it("should include topics in enhanced prompt", () => {
      const memory: ConversationMemory = {
        recentSummary: "Test session",
        keyFacts: [],
        topics: ["algebra", "geometria", "aritmetica"],
        lastSessionDate: new Date(),
      };

      const enhanced = enhanceSystemPrompt({
        basePrompt: "Sei Archimede.",
        memory,
        safetyOptions: { role: "maestro" },
      });

      expect(enhanced).toContain("algebra");
      expect(enhanced).toContain("geometria");
    });

    it("should format memories in Italian", () => {
      const memory: ConversationMemory = {
        recentSummary: "Previous session content",
        keyFacts: ["Test fact"],
        topics: ["math"],
        lastSessionDate: new Date(),
      };

      const enhanced = enhanceSystemPrompt({
        basePrompt: "Base prompt",
        memory,
        safetyOptions: { role: "maestro" },
      });

      // Should use Italian formatting (Memoria section)
      expect(enhanced).toContain("Memoria delle Sessioni Precedenti");
    });
  });

  describe("Safety Integration", () => {
    it("should always include safety guardrails regardless of memory", () => {
      const memories: ConversationMemory[] = [
        {
          recentSummary: null,
          keyFacts: [],
          topics: [],
          lastSessionDate: null,
        },
        {
          recentSummary: "Has content",
          keyFacts: ["test fact"],
          topics: ["topic1"],
          lastSessionDate: new Date(),
        },
      ];

      for (const memory of memories) {
        const enhanced = enhanceSystemPrompt({
          basePrompt: "Base prompt",
          memory,
          safetyOptions: { role: "maestro" },
        });

        expect(hasSafetyGuardrails(enhanced)).toBe(true);
      }
    });

    it("should apply safety to all roles", () => {
      const memory: ConversationMemory = {
        recentSummary: "Test",
        keyFacts: ["fact"],
        topics: ["topic"],
        lastSessionDate: new Date(),
      };

      const roles = ["maestro", "coach", "buddy"] as const;

      for (const role of roles) {
        const enhanced = enhanceSystemPrompt({
          basePrompt: "Base prompt",
          memory,
          safetyOptions: { role },
        });

        expect(hasSafetyGuardrails(enhanced)).toBe(true);
      }
    });
  });

  describe("Memory Context Detection", () => {
    it("should detect memory context in enhanced prompts", () => {
      const memory: ConversationMemory = {
        recentSummary: "Has summary",
        keyFacts: ["fact"],
        topics: [],
        lastSessionDate: new Date(),
      };

      const enhanced = enhanceSystemPrompt({
        basePrompt: "Base",
        memory,
        safetyOptions: { role: "maestro" },
      });

      expect(hasMemoryContext(enhanced)).toBe(true);
    });

    it("should not detect memory in prompts without it", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const enhanced = enhanceSystemPrompt({
        basePrompt: "Base",
        memory,
        safetyOptions: { role: "maestro" },
      });

      expect(hasMemoryContext(enhanced)).toBe(false);
    });
  });

  describe("Base Prompt Extraction", () => {
    it("should extract base prompt from enhanced prompt", () => {
      const memory: ConversationMemory = {
        recentSummary: "Summary",
        keyFacts: ["fact"],
        topics: [],
        lastSessionDate: new Date(),
      };

      const basePrompt = "Sei Archimede.";
      const enhanced = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions: { role: "maestro" },
      });

      const extracted = extractBasePrompt(enhanced);

      // Extracted should have safety but not memory
      expect(hasSafetyGuardrails(extracted)).toBe(true);
      expect(hasMemoryContext(extracted)).toBe(false);
    });
  });

  describe("Relative Date Formatting", () => {
    it("should format today correctly", () => {
      const today = new Date();
      expect(formatRelativeDate(today)).toBe("oggi");
    });

    it("should format yesterday correctly", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeDate(yesterday)).toBe("ieri");
    });

    it("should format days ago correctly", () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - 3);
      expect(formatRelativeDate(daysAgo)).toBe("3 giorni fa");
    });

    it("should format weeks ago correctly", () => {
      const weeksAgo = new Date();
      weeksAgo.setDate(weeksAgo.getDate() - 10);
      expect(formatRelativeDate(weeksAgo)).toBe("la settimana scorsa");
    });

    it("should handle null dates", () => {
      expect(formatRelativeDate(null)).toBe("data sconosciuta");
    });
  });
});
