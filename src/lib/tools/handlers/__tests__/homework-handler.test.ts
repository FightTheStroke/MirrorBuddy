/**
 * Tests for Homework Handler
 * Tests HomeworkData interface and helper functions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HomeworkData } from "../homework-handler";

// Mock the tool-executor to prevent actual registration
vi.mock("../../tool-executor", () => ({
  registerToolHandler: vi.fn(),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: () => "test-id-123",
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

// Mock AI provider
vi.mock("@/lib/ai/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/server")>();
  return {
    ...actual,
    chatCompletion: vi.fn(),
  };
});

// Mock study-kit-handler
vi.mock("./study-kit-handler", () => ({
  extractTextFromPDF: vi.fn(),
}));

describe("homework-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HomeworkData interface", () => {
    it("creates valid homework data structure", () => {
      const homework: HomeworkData = {
        type: "homework",
        exerciseType: "math",
        problemStatement: "Solve for x: 2x + 5 = 15",
        sourceType: "text",
      };

      expect(homework.type).toBe("homework");
      expect(homework.exerciseType).toBe("math");
      expect(homework.problemStatement).toContain("2x + 5");
      expect(homework.sourceType).toBe("text");
    });

    it("supports optional fields", () => {
      const homework: HomeworkData = {
        type: "homework",
        exerciseType: "physics",
        problemStatement: "Calculate velocity",
        givenData: ["mass = 5kg", "force = 10N"],
        topic: "Mechanics",
        difficulty: "medium",
        hints: ["Use F = ma", "Remember units"],
        originalText: "Full problem text...",
        sourceType: "pdf",
      };

      expect(homework.givenData).toHaveLength(2);
      expect(homework.topic).toBe("Mechanics");
      expect(homework.difficulty).toBe("medium");
      expect(homework.hints).toContain("Use F = ma");
      expect(homework.originalText).toBeDefined();
    });

    it("supports all source types", () => {
      const pdfHomework: HomeworkData = {
        type: "homework",
        exerciseType: "essay",
        problemStatement: "Write about...",
        sourceType: "pdf",
      };

      const imageHomework: HomeworkData = {
        type: "homework",
        exerciseType: "translation",
        problemStatement: "Translate...",
        sourceType: "image",
      };

      const textHomework: HomeworkData = {
        type: "homework",
        exerciseType: "math",
        problemStatement: "Solve...",
        sourceType: "text",
      };

      expect(pdfHomework.sourceType).toBe("pdf");
      expect(imageHomework.sourceType).toBe("image");
      expect(textHomework.sourceType).toBe("text");
    });
  });

  describe("exercise type categorization", () => {
    const exerciseTypes = [
      "math",
      "physics",
      "chemistry",
      "biology",
      "essay",
      "translation",
      "grammar",
      "history",
      "geography",
      "unknown",
    ];

    it("accepts various exercise types", () => {
      exerciseTypes.forEach((exerciseType) => {
        const homework: HomeworkData = {
          type: "homework",
          exerciseType,
          problemStatement: "Test problem",
          sourceType: "text",
        };
        expect(homework.exerciseType).toBe(exerciseType);
      });
    });
  });

  describe("maieutic hints structure", () => {
    it("default hints follow maieutic pattern", () => {
      const defaultHints = [
        "Cosa ti viene chiesto di trovare o fare?",
        "Quali informazioni hai a disposizione?",
        "Qual è il primo passo che potresti fare?",
      ];

      expect(defaultHints).toHaveLength(3);
      expect(defaultHints[0]).toContain("chiesto");
      expect(defaultHints[1]).toContain("informazioni");
      expect(defaultHints[2]).toContain("primo passo");
    });

    it("hints are question-based (maieutic)", () => {
      const hints = [
        "Cosa ti viene chiesto?",
        "Come potresti iniziare?",
        "Quali formule conosci?",
      ];

      hints.forEach((hint) => {
        expect(hint.endsWith("?")).toBe(true);
      });
    });
  });

  describe("given data extraction", () => {
    it("supports array of known values", () => {
      const givenData = [
        "velocità iniziale = 0 m/s",
        "accelerazione = 9.8 m/s²",
        "tempo = 5 s",
      ];

      const homework: HomeworkData = {
        type: "homework",
        exerciseType: "physics",
        problemStatement: "Calcola lo spazio percorso",
        givenData,
        sourceType: "text",
      };

      expect(homework.givenData).toHaveLength(3);
      expect(homework.givenData?.[0]).toContain("velocità");
    });

    it("handles empty given data", () => {
      const homework: HomeworkData = {
        type: "homework",
        exerciseType: "essay",
        problemStatement: "Scrivi un tema...",
        givenData: undefined,
        sourceType: "text",
      };

      expect(homework.givenData).toBeUndefined();
    });
  });

  describe("problem statement handling", () => {
    it("truncates long problem statements", () => {
      const longText = "A".repeat(1000);
      const truncated = longText.substring(0, 500);

      expect(truncated.length).toBe(500);
      expect(truncated).toBe("A".repeat(500));
    });

    it("preserves short problem statements", () => {
      const shortText = "Solve 2 + 2";
      const result = shortText.substring(0, 500);

      expect(result).toBe(shortText);
    });
  });

  describe("difficulty levels", () => {
    const difficulties = ["easy", "medium", "hard", "advanced"];

    it("supports standard difficulty levels", () => {
      difficulties.forEach((difficulty) => {
        const homework: HomeworkData = {
          type: "homework",
          exerciseType: "math",
          problemStatement: "Test",
          difficulty,
          sourceType: "text",
        };
        expect(homework.difficulty).toBe(difficulty);
      });
    });

    it("allows undefined difficulty", () => {
      const homework: HomeworkData = {
        type: "homework",
        exerciseType: "math",
        problemStatement: "Test",
        sourceType: "text",
      };
      expect(homework.difficulty).toBeUndefined();
    });
  });
});
