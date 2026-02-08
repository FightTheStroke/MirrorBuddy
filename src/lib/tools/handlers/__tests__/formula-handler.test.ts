/**
 * Tests for Formula Handler
 * Coverage improvement for tools/handlers/formula-handler.ts
 * Tests: isLatex, validateLatex, generateLatexFromDescription, handler callback
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted() so these are available when vi.mock() factory runs
const { capturedHandler, mockChatCompletion, mockRegisterToolHandler } =
  vi.hoisted(() => {
    let handler: ((args: Record<string, unknown>) => Promise<unknown>) | null =
      null;

    return {
      capturedHandler: { get: () => handler },
      mockRegisterToolHandler: vi.fn(
        (
          toolId: string,
          h: (args: Record<string, unknown>) => Promise<unknown>,
        ) => {
          if (toolId === "create_formula") {
            handler = h;
          }
        },
      ),
      mockChatCompletion: vi.fn(() =>
        Promise.resolve({
          content: '{"latex": "\\\\frac{a}{b}", "explanation": "a over b"}',
        }),
      ),
    };
  });

vi.mock("../../tool-executor", () => ({
  registerToolHandler: mockRegisterToolHandler,
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id-123"),
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

vi.mock("@/lib/ai/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/server")>();
  return {
    ...actual,
    chatCompletion: mockChatCompletion,
    getDeploymentForModel: vi.fn((model: string) => model),
  };
});

vi.mock("@/lib/tier/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tier/server")>();
  return {
    ...actual,
    tierService: {
      getFeatureAIConfigForUser: vi.fn(() =>
        Promise.resolve({
          model: "gpt-4o",
          temperature: 0.3,
          maxTokens: 1500,
        }),
      ),
    },
  };
});

import {
  isLatex,
  validateLatex,
  generateLatexFromDescription,
} from "../formula-handler";

describe("formula-handler", () => {
  describe("isLatex", () => {
    it("detects LaTeX commands", () => {
      expect(isLatex("\\frac{1}{2}")).toBe(true);
      expect(isLatex("\\sqrt{x}")).toBe(true);
      expect(isLatex("\\sum_{i=1}^{n}")).toBe(true);
      expect(isLatex("\\int_{0}^{\\infty}")).toBe(true);
      expect(isLatex("\\prod_{i=1}^{n}")).toBe(true);
    });

    it("detects superscripts", () => {
      expect(isLatex("x^2")).toBe(true);
      expect(isLatex("x^{10}")).toBe(true);
      expect(isLatex("e^{-x}")).toBe(true);
    });

    it("detects subscripts", () => {
      expect(isLatex("x_n")).toBe(true);
      expect(isLatex("a_{max}")).toBe(true);
      expect(isLatex("x_{i}")).toBe(true);
    });

    it("detects delimiters", () => {
      expect(isLatex("\\left( x \\right)")).toBe(true);
      expect(isLatex("\\left[ x \\right]")).toBe(true);
    });

    it("returns false for plain text", () => {
      expect(isLatex("hello world")).toBe(false);
      expect(isLatex("2 + 2 = 4")).toBe(false);
      expect(isLatex("simple math")).toBe(false);
    });

    it("detects Greek letters", () => {
      expect(isLatex("\\alpha + \\beta")).toBe(true);
      expect(isLatex("\\pi r^2")).toBe(true);
    });
  });

  describe("validateLatex", () => {
    it("validates correct LaTeX", () => {
      expect(validateLatex("a^{2} + b^{2} = c^{2}")).toEqual({ valid: true });
      expect(validateLatex("\\frac{a}{b}")).toEqual({ valid: true });
      expect(validateLatex("\\sqrt{x}")).toEqual({ valid: true });
    });

    it("detects unbalanced opening braces", () => {
      const result = validateLatex("a^{2");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unbalanced braces");
    });

    it("detects unbalanced closing braces", () => {
      const result = validateLatex("a^2}");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unbalanced braces");
    });

    it("validates balanced nested braces", () => {
      expect(validateLatex("\\frac{a^{2}}{b^{2}}")).toEqual({ valid: true });
      expect(validateLatex("{{{{a}}}}")).toEqual({ valid: true });
    });

    it("detects unbalanced delimiters", () => {
      const result = validateLatex("\\left( x + y");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unbalanced delimiters");
    });

    it("validates balanced delimiters", () => {
      expect(validateLatex("\\left( x \\right)")).toEqual({ valid: true });
      expect(validateLatex("\\left[ \\frac{a}{b} \\right]")).toEqual({
        valid: true,
      });
    });

    it("handles multiple delimiter pairs", () => {
      expect(validateLatex("\\left( \\left[ x \\right] \\right)")).toEqual({
        valid: true,
      });
    });

    it("validates empty string", () => {
      expect(validateLatex("")).toEqual({ valid: true });
    });

    it("validates simple expressions without special syntax", () => {
      expect(validateLatex("a + b = c")).toEqual({ valid: true });
    });

    it("counts braces correctly with unmatched count", () => {
      const result = validateLatex("{{{");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("3 unclosed");
    });
  });

  describe("generateLatexFromDescription", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockChatCompletion.mockResolvedValue({
        content: '{"latex": "\\\\frac{a}{b}", "explanation": "a over b"}',
      });
    });

    it("generates LaTeX from description", async () => {
      mockChatCompletion.mockResolvedValue({
        content:
          '{"latex": "a^{2} + b^{2} = c^{2}", "explanation": "Pythagorean theorem"}',
      });

      const result = await generateLatexFromDescription("pythagorean theorem");

      expect(result).toEqual({
        latex: "a^{2} + b^{2} = c^{2}",
        explanation: "Pythagorean theorem",
      });
      expect(mockChatCompletion).toHaveBeenCalled();
    });

    it("returns null when JSON parsing fails (no JSON in response)", async () => {
      mockChatCompletion.mockResolvedValue({
        content: "This is not JSON at all, just plain text.",
      });

      const result = await generateLatexFromDescription("some formula");

      expect(result).toBeNull();
    });

    it("returns null when chatCompletion throws", async () => {
      mockChatCompletion.mockRejectedValue(new Error("API error"));

      const result = await generateLatexFromDescription("some formula");

      expect(result).toBeNull();
    });

    it("handles empty latex in response", async () => {
      mockChatCompletion.mockResolvedValue({
        content: '{"latex": "", "explanation": "empty"}',
      });

      const result = await generateLatexFromDescription("some formula");

      expect(result).toEqual({
        latex: "",
        explanation: "empty",
      });
    });

    it("handles missing explanation", async () => {
      mockChatCompletion.mockResolvedValue({
        content: '{"latex": "x^2"}',
      });

      const result = await generateLatexFromDescription("x squared");

      expect(result).toEqual({
        latex: "x^2",
        explanation: undefined,
      });
    });

    it("handles response with extra whitespace around JSON", async () => {
      mockChatCompletion.mockResolvedValue({
        content: '  \n  {"latex": "\\\\pi", "explanation": "pi"}  \n  ',
      });

      const result = await generateLatexFromDescription("pi");

      expect(result).toEqual({
        latex: "\\pi",
        explanation: "pi",
      });
    });
  });

  describe("handler callback", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockChatCompletion.mockResolvedValue({
        content: '{"latex": "\\\\frac{a}{b}", "explanation": "a over b"}',
      });
    });

    it("should have captured the handler", () => {
      expect(capturedHandler.get()).not.toBeNull();
    });

    it("returns error when no input provided", async () => {
      const result = await capturedHandler.get()!({});

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("Specifica una formula LaTeX"),
      });
    });

    it("processes valid LaTeX input", async () => {
      const result = (await capturedHandler.get()!({
        latex: "\\frac{a}{b}",
      })) as { success: boolean; data: { latex: string } };

      expect(result.success).toBe(true);
      expect(result.data.latex).toBe("\\frac{a}{b}");
    });

    it("rejects invalid LaTeX with unbalanced braces", async () => {
      const result = await capturedHandler.get()!({
        latex: "\\frac{a}{b",
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("LaTeX non valido"),
      });
    });

    it("sets displayMode to block for long LaTeX", async () => {
      const longLatex = "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}";
      const result = (await capturedHandler.get()!({
        latex: longLatex,
      })) as { success: boolean; data: { displayMode: string } };

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("block");
    });

    it("sets displayMode to block for LaTeX with integral", async () => {
      const result = (await capturedHandler.get()!({
        latex: "\\int x dx",
      })) as { success: boolean; data: { displayMode: string } };

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("block");
    });

    it("sets displayMode to block for LaTeX with sum", async () => {
      const result = (await capturedHandler.get()!({
        latex: "\\sum_{i=1}^n i",
      })) as { success: boolean; data: { displayMode: string } };

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("block");
    });

    it("sets displayMode to inline for short simple LaTeX", async () => {
      const result = (await capturedHandler.get()!({
        latex: "x^2",
      })) as { success: boolean; data: { displayMode: string } };

      expect(result.success).toBe(true);
      expect(result.data.displayMode).toBe("inline");
    });

    it("includes description when provided with LaTeX", async () => {
      const result = (await capturedHandler.get()!({
        latex: "\\pi",
        description: "The constant pi",
      })) as { success: boolean; data: { description: string } };

      expect(result.success).toBe(true);
      expect(result.data.description).toBe("The constant pi");
    });

    it("processes description that is LaTeX", async () => {
      const result = (await capturedHandler.get()!({
        description: "\\alpha + \\beta",
      })) as { success: boolean; data: { latex: string } };

      expect(result.success).toBe(true);
      expect(result.data.latex).toBe("\\alpha + \\beta");
    });

    it("rejects invalid LaTeX in description", async () => {
      const result = await capturedHandler.get()!({
        description: "\\frac{a}{b",
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("LaTeX non valido"),
      });
    });

    it("generates LaTeX from natural language description", async () => {
      mockChatCompletion.mockResolvedValue({
        content: '{"latex": "\\\\sqrt{x}", "explanation": "Square root of x"}',
      });

      const result = (await capturedHandler.get()!({
        description: "the square root of x",
      })) as { success: boolean; data: { latex: string; description: string } };

      expect(result.success).toBe(true);
      expect(result.data.latex).toBe("\\sqrt{x}");
      expect(result.data.description).toBe("Square root of x");
    });

    it("returns error when generation fails", async () => {
      mockChatCompletion.mockResolvedValue({
        content: "not json",
      });

      const result = await capturedHandler.get()!({
        description: "some formula description",
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("Non sono riuscito a generare"),
      });
    });

    it("uses original description when no explanation returned", async () => {
      mockChatCompletion.mockResolvedValue({
        content: '{"latex": "x^2"}',
      });

      const result = (await capturedHandler.get()!({
        description: "x squared",
      })) as { success: boolean; data: { description: string } };

      expect(result.success).toBe(true);
      expect(result.data.description).toBe("x squared");
    });

    it("includes toolId and toolType in result", async () => {
      const result = (await capturedHandler.get()!({
        latex: "x^2",
      })) as { toolId: string; toolType: string };

      expect(result.toolId).toBe("test-id-123");
      expect(result.toolType).toBe("formula");
    });

    it("trims whitespace from latex input", async () => {
      const result = (await capturedHandler.get()!({
        latex: "  x^2  ",
      })) as { success: boolean; data: { latex: string } };

      expect(result.success).toBe(true);
      expect(result.data.latex).toBe("x^2");
    });
  });
});
