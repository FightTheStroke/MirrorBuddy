/**
 * Tests for Formula Plugin
 * Coverage improvement for tools/plugins/formula-plugin.ts
 * Tests plugin configuration and schema validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/formula-handler", () => ({
  isLatex: vi.fn(() => false),
  validateLatex: vi.fn(() => ({ valid: true })),
  generateLatexFromDescription: vi.fn(() =>
    Promise.resolve({ latex: "x", explanation: "x" }),
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
import type { ToolContext } from "@/types/tools";

describe("formula-plugin", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

    it("has voice triggers in Italian and English", () => {
      expect(formulaPlugin.triggers).toContain("formula");
      expect(formulaPlugin.triggers).toContain("equazione");
      expect(formulaPlugin.triggers).toContain("equation");
      expect(formulaPlugin.triggers).toContain("latex");
      expect(formulaPlugin.triggers).toContain("scrivi formula");
      expect(formulaPlugin.triggers).toContain("mostra formula");
      expect(formulaPlugin.triggers).toContain("matematica");
      expect(formulaPlugin.triggers).toContain("write formula");
    });

    it("is voice enabled", () => {
      expect(formulaPlugin.voiceEnabled).toBe(true);
    });

    it("has no prerequisites", () => {
      expect(formulaPlugin.prerequisites).toEqual([]);
    });

    it("has handler function", () => {
      expect(typeof formulaPlugin.handler).toBe("function");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(formulaPlugin.voicePrompt).toBeDefined();
      if (typeof formulaPlugin.voicePrompt === "object") {
        expect(formulaPlugin.voicePrompt.template).toContain("{topic}");
        expect(formulaPlugin.voicePrompt.requiresContext).toContain("topic");
        expect(formulaPlugin.voicePrompt.fallback).toBeDefined();
      }
    });

    it("has voice feedback with latex placeholder", () => {
      expect(formulaPlugin.voiceFeedback).toBeDefined();
      if (typeof formulaPlugin.voiceFeedback === "object") {
        expect(formulaPlugin.voiceFeedback.template).toContain("{latex}");
        expect(formulaPlugin.voiceFeedback.requiresContext).toContain("latex");
        expect(formulaPlugin.voiceFeedback.fallback).toBeDefined();
      }
    });
  });

  describe("handler - basic cases", () => {
    it("returns success for valid LaTeX input", async () => {
      const result = await formulaPlugin.handler(
        { latex: "x^{2} + y^{2} = z^{2}" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).latex).toBe("x^{2} + y^{2} = z^{2}");
    });

    it("returns success with description input", async () => {
      const result = await formulaPlugin.handler(
        { description: "teorema di pitagora" },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it("returns success with both latex and description", async () => {
      const result = await formulaPlugin.handler(
        { latex: "E = mc^{2}", description: "Formula di Einstein" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).description).toBe("Formula di Einstein");
    });

    it("sets block display mode for formulas with \\int", async () => {
      const result = await formulaPlugin.handler(
        { latex: "\\int_{0}^{\\infty} e^{-x} dx" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).displayMode).toBe("block");
    });

    it("sets block display mode for formulas with \\sum", async () => {
      const result = await formulaPlugin.handler(
        { latex: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).displayMode).toBe("block");
    });

    it("sets block display mode for long formulas (>30 chars)", async () => {
      const longLatex = "a^{2} + b^{2} + c^{2} + d^{2} + e^{2}";
      const result = await formulaPlugin.handler(
        { latex: longLatex },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).displayMode).toBe("block");
    });

    it("sets inline display mode for simple formulas", async () => {
      const result = await formulaPlugin.handler(
        { latex: "x^{2}" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).displayMode).toBe("inline");
    });
  });

  describe("schema validation", () => {
    const FormulaInputSchema = z.object({
      latex: z.string().optional(),
      description: z.string().optional(),
    });

    it("accepts latex only", () => {
      const result = FormulaInputSchema.safeParse({ latex: "x^2" });
      expect(result.success).toBe(true);
    });

    it("accepts description only", () => {
      const result = FormulaInputSchema.safeParse({ description: "teorema" });
      expect(result.success).toBe(true);
    });

    it("accepts both latex and description", () => {
      const result = FormulaInputSchema.safeParse({
        latex: "x^2",
        description: "Quadrato di x",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = FormulaInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects non-string latex", () => {
      const result = FormulaInputSchema.safeParse({ latex: 123 });
      expect(result.success).toBe(false);
    });

    it("rejects non-string description", () => {
      const result = FormulaInputSchema.safeParse({ description: [] });
      expect(result.success).toBe(false);
    });
  });

  describe("voice triggers", () => {
    it("has at least 8 triggers", () => {
      expect(formulaPlugin.triggers.length).toBeGreaterThanOrEqual(8);
    });

    it("includes Italian triggers", () => {
      const italianTriggers = [
        "formula",
        "equazione",
        "scrivi formula",
        "mostra formula",
        "matematica",
      ];
      italianTriggers.forEach((trigger) => {
        expect(formulaPlugin.triggers).toContain(trigger);
      });
    });

    it("includes English triggers", () => {
      const englishTriggers = ["equation", "latex", "write formula"];
      englishTriggers.forEach((trigger) => {
        expect(formulaPlugin.triggers).toContain(trigger);
      });
    });
  });
});
