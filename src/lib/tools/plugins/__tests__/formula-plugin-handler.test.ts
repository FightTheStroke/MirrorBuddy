/**
 * Tests for Formula Plugin Handler
 * Coverage improvement for tools/plugins/formula-plugin.ts
 * Tests all branches: latex input, description input, validation, generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/formula-handler", () => ({
  isLatex: vi.fn((text: string) => text.startsWith("\\")),
  validateLatex: vi.fn(() => ({ valid: true })),
  generateLatexFromDescription: vi.fn(() =>
    Promise.resolve({ latex: "\\frac{1}{2}", explanation: "One half" }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { formulaPlugin } from "../formula-plugin";
import {
  isLatex,
  validateLatex,
  generateLatexFromDescription,
} from "../../handlers/formula-handler";
import type { ToolContext } from "@/types/tools";

describe("formula-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
    studentAge: 14,
    studentName: "Marco",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateLatex).mockReturnValue({ valid: true });
    vi.mocked(isLatex).mockImplementation((text: string) =>
      text.startsWith("\\"),
    );
    vi.mocked(generateLatexFromDescription).mockResolvedValue({
      latex: "\\frac{1}{2}",
      explanation: "One half",
    });
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(formulaPlugin.id).toBe("create_formula");
    });

    it("has correct name", () => {
      expect(formulaPlugin.name).toBe("Formula");
    });

    it("has correct category", () => {
      expect(formulaPlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(formulaPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(formulaPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("is voice enabled", () => {
      expect(formulaPlugin.voiceEnabled).toBe(true);
    });

    it("has voice triggers in Italian and English", () => {
      expect(formulaPlugin.triggers).toContain("formula");
      expect(formulaPlugin.triggers).toContain("equazione");
      expect(formulaPlugin.triggers).toContain("equation");
      expect(formulaPlugin.triggers).toContain("latex");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(formulaPlugin.voicePrompt).toBeDefined();
      if (typeof formulaPlugin.voicePrompt === "object") {
        expect(formulaPlugin.voicePrompt.template).toContain("{topic}");
      }
    });

    it("has voice feedback with latex placeholder", () => {
      expect(formulaPlugin.voiceFeedback).toBeDefined();
      if (typeof formulaPlugin.voiceFeedback === "object") {
        expect(formulaPlugin.voiceFeedback.template).toContain("{latex}");
      }
    });
  });

  describe("handler - latex input", () => {
    it("accepts valid latex string", async () => {
      const result = await formulaPlugin.handler(
        { latex: "\\frac{a}{b}" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.latex).toBe("\\frac{a}{b}");
    });

    it("trims latex whitespace", async () => {
      const result = await formulaPlugin.handler(
        { latex: "  \\sum_{i=1}^n  " },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.latex).toBe("\\sum_{i=1}^n");
    });

    it("rejects invalid latex", async () => {
      vi.mocked(validateLatex).mockReturnValueOnce({
        valid: false,
        error: "Missing closing brace",
      });

      const result = await formulaPlugin.handler(
        { latex: "\\frac{a}{b" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("LaTeX non valido");
      expect(result.error).toContain("Missing closing brace");
    });

    it("includes description when provided with latex", async () => {
      const result = await formulaPlugin.handler(
        { latex: "\\pi", description: "The constant pi" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.description).toBe("The constant pi");
    });

    it("sets displayMode to block for long latex", async () => {
      const longLatex = "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}";
      const result = await formulaPlugin.handler(
        { latex: longLatex },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("block");
    });

    it("sets displayMode to block for latex with integral", async () => {
      const result = await formulaPlugin.handler(
        { latex: "\\int x dx" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("block");
    });

    it("sets displayMode to block for latex with sum", async () => {
      const result = await formulaPlugin.handler(
        { latex: "\\sum_{i=1}^n i" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("block");
    });

    it("sets displayMode to inline for short simple latex", async () => {
      const result = await formulaPlugin.handler({ latex: "x^2" }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("inline");
    });
  });

  describe("handler - description input (is latex)", () => {
    it("detects latex in description field", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(true);

      const result = await formulaPlugin.handler(
        { description: "\\alpha + \\beta" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.latex).toBe("\\alpha + \\beta");
      expect(result.data.description).toBeUndefined();
    });

    it("rejects invalid latex in description", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(true);
      vi.mocked(validateLatex).mockReturnValueOnce({
        valid: false,
        error: "Unknown command",
      });

      const result = await formulaPlugin.handler(
        { description: "\\invalid" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("LaTeX non valido");
    });

    it("sets displayMode based on length when description is latex", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(true);

      const result = await formulaPlugin.handler(
        { description: "\\x" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("inline");
    });
  });

  describe("handler - description input (generate latex)", () => {
    it("generates latex from natural language", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(false);

      const result = await formulaPlugin.handler(
        { description: "the square root of x" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.latex).toBe("\\frac{1}{2}");
      expect(result.data.description).toBe("One half");
      expect(generateLatexFromDescription).toHaveBeenCalledWith(
        "the square root of x",
      );
    });

    it("returns error when generation fails (null result)", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(false);
      vi.mocked(generateLatexFromDescription).mockResolvedValueOnce(
        null as never,
      );

      const result = await formulaPlugin.handler(
        { description: "some formula" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Non sono riuscito a generare la formula");
    });

    it("returns error when generation returns empty latex", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(false);
      vi.mocked(generateLatexFromDescription).mockResolvedValueOnce({
        latex: "",
      });

      const result = await formulaPlugin.handler(
        { description: "some formula" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Non sono riuscito a generare la formula");
    });

    it("uses original description when no explanation returned", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(false);
      vi.mocked(generateLatexFromDescription).mockResolvedValueOnce({
        latex: "\\sqrt{x}",
        explanation: undefined,
      });

      const result = await formulaPlugin.handler(
        { description: "the square root of x" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.description).toBe("the square root of x");
    });

    it("sets displayMode based on generated latex length", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(false);
      vi.mocked(generateLatexFromDescription).mockResolvedValueOnce({
        latex: "x",
        explanation: "Just x",
      });

      const result = await formulaPlugin.handler(
        { description: "just x" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("inline");
    });
  });

  describe("handler - validation errors", () => {
    it("rejects missing input", async () => {
      const result = await formulaPlugin.handler({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Specifica una formula LaTeX");
    });

    it("rejects empty latex and description", async () => {
      const result = await formulaPlugin.handler(
        { latex: "", description: "" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("handler - error handling", () => {
    it("handles generation throwing Error", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(false);
      vi.mocked(generateLatexFromDescription).mockRejectedValueOnce(
        new Error("Generation service down"),
      );

      const result = await formulaPlugin.handler(
        { description: "some formula" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Generation service down");
    });

    it("handles non-Error exception", async () => {
      vi.mocked(isLatex).mockReturnValueOnce(false);
      vi.mocked(generateLatexFromDescription).mockRejectedValueOnce(
        "string error",
      );

      const result = await formulaPlugin.handler(
        { description: "some formula" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });
});
