/**
 * Edge Case Tests for System Prompt Enhancer
 *
 * Tests for boundary conditions, malformed input, and complex scenarios
 */

import { describe, it, expect, vi } from "vitest";
import {
  enhanceSystemPrompt,
  hasMemoryContext,
  extractBasePrompt,
} from "../prompt-enhancer";
import type { ConversationMemory } from "../memory-loader";
import type { TierMemoryLimits } from "../tier-memory-config";
import type { CrossMaestroLearning } from "../cross-maestro-memory";

// Mock safety guardrails
vi.mock("@/lib/safety/safety-prompts", () => ({
  injectSafetyGuardrails: vi.fn((prompt, _options) => `[SAFE] ${prompt}`),
}));

describe("Prompt Enhancer Edge Cases", () => {
  const basePrompt = "Base prompt";
  const safetyOptions = { role: "maestro" as const };

  describe("Empty and minimal data handling", () => {
    it("handles completely empty memory", () => {
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

      expect(result).toBe("[SAFE] Base prompt");
      expect(result).not.toContain("Memoria");
    });

    it("handles empty keyFacts array", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).not.toContain("Fatti Chiave");
    });

    it("handles empty topics array", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).not.toContain("Argomenti Già Trattati");
    });

    it("handles single key fact", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: ["Single fact"],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Fatti Chiave");
      expect(result).toContain("Single fact");
    });

    it("handles single topic", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: ["Single topic"],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Argomenti Già Trattati");
      expect(result).toContain("Single topic");
    });
  });

  describe("Very long strings handling", () => {
    it("handles very long recent summary", () => {
      const longSummary = "A".repeat(10000); // 10k characters

      const memory: ConversationMemory = {
        recentSummary: longSummary,
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date(),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain(longSummary);
      expect(result).toContain("Memoria delle Sessioni Precedenti");
    });

    it("handles very long key facts", () => {
      const longFact = "X".repeat(5000);

      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [longFact, "Short fact"],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain(longFact);
      expect(result).toContain("Short fact");
    });

    it("handles topics list with many items", () => {
      const manyTopics = Array.from({ length: 100 }, (_, i) => `Topic ${i}`);

      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: manyTopics,
        lastSessionDate: null,
      };

      // Without limit, should include all
      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      const topicString = manyTopics.join(", ");
      expect(result).toContain(topicString);
    });
  });

  describe("Tier limit edge cases", () => {
    it("handles maxKeyFacts = 1", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: ["Fact 1", "Fact 2", "Fact 3"],
        topics: [],
        lastSessionDate: null,
      };

      const tierLimits: TierMemoryLimits = {
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 1, // Only 1
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits,
      });

      expect(result).toContain("Fact 1");
      expect(result).not.toContain("Fact 2");
      expect(result).not.toContain("Fact 3");
    });

    it("handles maxTopics = 1", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: ["Topic 1", "Topic 2", "Topic 3"],
        lastSessionDate: null,
      };

      const tierLimits: TierMemoryLimits = {
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 10,
        maxTopics: 1, // Only 1
        semanticEnabled: false,
        crossMaestroEnabled: false,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits,
      });

      expect(result).toContain("Topic 1");
      expect(result).not.toContain("Topic 2");
      expect(result).not.toContain("Topic 3");
    });

    it("handles maxKeyFacts limit exceeding available facts", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: ["Fact 1", "Fact 2"],
        topics: [],
        lastSessionDate: null,
      };

      const tierLimits: TierMemoryLimits = {
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 100, // More than available
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits,
      });

      expect(result).toContain("Fact 1");
      expect(result).toContain("Fact 2");
    });
  });

  describe("Special characters and escaping", () => {
    it("handles special characters in facts", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [
          'Fact with "quotes"',
          "Fact with 'apostrophe'",
          "Fact with special chars: !@#$%^&*()",
          "Fact with unicode: 你好世界 🌍",
        ],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain('Fact with "quotes"');
      expect(result).toContain("Fact with 'apostrophe'");
      expect(result).toContain("!@#$%^&*()");
      expect(result).toContain("你好世界");
    });

    it("handles newlines in facts", () => {
      const memory: ConversationMemory = {
        recentSummary: "Summary with\nmultiple\nlines",
        keyFacts: ["Fact with\nnewline"],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Summary with\nmultiple\nlines");
      expect(result).toContain("Fact with\nnewline");
    });
  });

  describe("Cross-maestro and memory interaction", () => {
    it("includes both memory and cross-maestro sections when both present", () => {
      const memory: ConversationMemory = {
        recentSummary: "Memory summary",
        keyFacts: ["Fact 1"],
        topics: ["Topic 1"],
        lastSessionDate: new Date(),
      };

      const crossMaestro: CrossMaestroLearning[] = [
        {
          maestroId: "galileo",
          maestroName: "Galileo",
          subject: "physics",
          learnings: ["Physics concept"],
          date: new Date(),
        },
      ];

      const tierLimits: TierMemoryLimits = {
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits,
        crossMaestroLearnings: crossMaestro,
      });

      // Both sections should be present
      expect(result).toContain("## Memoria delle Sessioni Precedenti");
      expect(result).toContain("## Conoscenze Interdisciplinari");
      expect(result).toContain("Memory summary");
      expect(result).toContain("Physics concept");
    });

    it("handles only cross-maestro with no regular memory", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const crossMaestro: CrossMaestroLearning[] = [
        {
          maestroId: "galileo",
          maestroName: "Galileo",
          subject: "physics",
          learnings: ["Physics concept"],
          date: new Date(),
        },
      ];

      const tierLimits: TierMemoryLimits = {
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits,
        crossMaestroLearnings: crossMaestro,
      });

      expect(result).toContain("## Conoscenze Interdisciplinari");
      expect(result).not.toContain("## Memoria delle Sessioni Precedenti");
      expect(result).toContain("Physics concept");
    });

    it("handles many cross-maestro learnings", () => {
      const memory: ConversationMemory = {
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const crossMaestro: CrossMaestroLearning[] = Array.from(
        { length: 20 },
        (_, i) => ({
          maestroId: `maestro-${i}`,
          maestroName: `Maestro ${i}`,
          subject: `subject-${i}`,
          learnings: [`Learning from maestro ${i}`],
          date: new Date(),
        }),
      );

      const tierLimits: TierMemoryLimits = {
        recentConversations: 5,
        timeWindowDays: null,
        maxKeyFacts: 50,
        maxTopics: 30,
        semanticEnabled: true,
        crossMaestroEnabled: true,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
        tierLimits,
        crossMaestroLearnings: crossMaestro,
      });

      // Should include all maestros
      for (let i = 0; i < 20; i++) {
        expect(result).toContain(`Maestro ${i}`);
      }
    });
  });

  describe("Memory context detection", () => {
    it("correctly detects memory context in various positions", () => {
      const withMemory = "Start\n## Memoria delle Sessioni Precedenti\nEnd";
      const withoutMemory = "Start\n## Other Section\nEnd";

      expect(hasMemoryContext(withMemory)).toBe(true);
      expect(hasMemoryContext(withoutMemory)).toBe(false);
    });

    it("detects memory context case-sensitively", () => {
      const lowerCase = "## memoria delle sessioni precedenti";
      const mixedCase = "## Memoria Delle Sessioni Precedenti";
      const correctCase = "## Memoria delle Sessioni Precedenti";

      expect(hasMemoryContext(correctCase)).toBe(true);
      expect(hasMemoryContext(lowerCase)).toBe(false);
      expect(hasMemoryContext(mixedCase)).toBe(false);
    });
  });

  describe("Base prompt extraction", () => {
    it("extracts base prompt before memory section", () => {
      const enhanced =
        "Base prompt\n\n## Memoria delle Sessioni Precedenti\nMemory content";
      const extracted = extractBasePrompt(enhanced);

      expect(extracted).toBe("Base prompt");
      expect(extracted).not.toContain("Memoria");
      expect(extracted).not.toContain("Memory content");
    });

    it("handles multiple memory sections (extracts to first one)", () => {
      const enhanced =
        "Base\n## Memoria delle Sessioni Precedenti\nMemory1\n## Memoria delle Sessioni Precedenti\nMemory2";
      const extracted = extractBasePrompt(enhanced);

      expect(extracted).toBe("Base");
    });

    it("handles extraction when no memory section exists", () => {
      const noMemory = "Just a simple prompt";
      const extracted = extractBasePrompt(noMemory);

      expect(extracted).toBe(noMemory);
    });

    it("trims whitespace correctly", () => {
      const enhanced = "Base prompt   \n\n## Memoria delle Sessioni Precedenti";
      const extracted = extractBasePrompt(enhanced);

      expect(extracted).toBe("Base prompt");
      expect(extracted).not.toMatch(/\s+$/);
    });
  });

  describe("Date formatting edge cases", () => {
    it("handles dates from far past", () => {
      const memory: ConversationMemory = {
        recentSummary: "Old summary",
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date("2000-01-01"),
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Ultimo Incontro");
      expect(result).toContain("Old summary");
    });

    it("handles current/today date", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const memory: ConversationMemory = {
        recentSummary: "Today's summary",
        keyFacts: [],
        topics: [],
        lastSessionDate: today,
      };

      const result = enhanceSystemPrompt({
        basePrompt,
        memory,
        safetyOptions,
      });

      expect(result).toContain("Ultimo Incontro");
      expect(result).toContain("Today's summary");
    });
  });

  describe("Safety guardrails interaction", () => {
    it("applies safety guardrails before adding memory", () => {
      const memory: ConversationMemory = {
        recentSummary: "Summary",
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      };

      const result = enhanceSystemPrompt({
        basePrompt: "Unsafe prompt",
        memory,
        safetyOptions: { role: "maestro" },
      });

      // Should start with safety marker
      expect(result).toMatch(/^\[SAFE\]/);
    });
  });
});
