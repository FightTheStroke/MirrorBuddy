/**
 * Tests for Demo Handler Execution
 * Coverage improvement for the actual handler function in demo-handler.ts
 * Tests all branches: validation, code generation, success/failure paths
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Use vi.hoisted() so these are available when vi.mock() factory runs
const {
  capturedHandler,
  mockRegisterToolHandler,
  mockValidateCode,
  mockSanitizeHtml,
  mockValidateDescription,
  mockGenerateDemoCode,
} = vi.hoisted(() => {
  let handler: ((args: Record<string, unknown>) => Promise<unknown>) | null =
    null;

  return {
    capturedHandler: { get: () => handler },
    mockRegisterToolHandler: vi.fn(
      (
        toolId: string,
        h: (args: Record<string, unknown>) => Promise<unknown>,
      ) => {
        if (toolId === "create_demo") {
          handler = h;
        }
      },
    ),
    mockValidateCode: vi.fn((): { safe: boolean; violations: string[] } => ({
      safe: true,
      violations: [],
    })),
    mockSanitizeHtml: vi.fn((html: string) => Promise.resolve(html)),
    mockValidateDescription: vi.fn(
      (): { valid: boolean; suggestions?: string[] } => ({ valid: true }),
    ),
    mockGenerateDemoCode: vi.fn(
      (
        _desc: Record<string, string>,
        _userId?: string,
      ): Promise<{ html: string; css: string; js?: string }> =>
        Promise.resolve({
          html: "<div>Demo</div>",
          css: ".demo { color: red; }",
          js: 'console.log("demo");',
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

vi.mock("../demo-validators", () => ({
  validateCode: mockValidateCode,
  sanitizeHtml: mockSanitizeHtml,
  validateDescription: mockValidateDescription,
}));

vi.mock("../demo-code-generator", () => ({
  generateDemoCode: mockGenerateDemoCode,
}));

describe("demo-handler execution", () => {
  beforeAll(async () => {
    // Import the module AFTER mocks are set up to trigger handler registration
    await import("../demo-handler");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateCode.mockReturnValue({ safe: true, violations: [] });
    mockValidateDescription.mockReturnValue({ valid: true });
    mockSanitizeHtml.mockImplementation((html: string) =>
      Promise.resolve(html),
    );
    mockGenerateDemoCode.mockResolvedValue({
      html: "<div>Demo</div>",
      css: ".demo { color: red; }",
      js: 'console.log("demo");',
    });
  });

  it("should have captured the handler", () => {
    expect(capturedHandler.get()).not.toBeNull();
  });

  describe("validation - missing fields", () => {
    it("returns error when title is missing", async () => {
      const result = await capturedHandler.get()!({
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("Mancano informazioni"),
      });
    });

    it("returns error when concept is missing", async () => {
      const result = await capturedHandler.get()!({
        title: "Test Title",
        visualization: "Test viz",
        interaction: "Test interaction",
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("Mancano informazioni"),
      });
    });

    it("returns error when visualization is missing", async () => {
      const result = await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        interaction: "Test interaction",
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("Mancano informazioni"),
      });
    });

    it("returns error when interaction is missing", async () => {
      const result = await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("Mancano informazioni"),
      });
    });

    it("returns error when all fields are missing", async () => {
      const result = await capturedHandler.get()!({});

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("Mancano informazioni"),
      });
    });
  });

  describe("description validation", () => {
    it("continues when description validation has suggestions", async () => {
      mockValidateDescription.mockReturnValue({
        valid: false,
        suggestions: ["Add more detail"],
      });

      const result = await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      });

      // Handler continues and generates code even with suggestions
      expect(result).toMatchObject({
        success: true,
      });
    });

    it("continues when description validation is valid", async () => {
      mockValidateDescription.mockReturnValue({ valid: true });

      const result = await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      });

      expect(result).toMatchObject({
        success: true,
      });
    });
  });

  describe("code generation", () => {
    it("returns error when code generation fails (null)", async () => {
      mockGenerateDemoCode.mockResolvedValue(null as never);

      const result = await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      });

      expect(result).toMatchObject({
        success: false,
        error: "Failed to generate demo code",
      });
    });

    it("passes wowFactor to code generator", async () => {
      await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
        wowFactor: "Amazing animation",
      });

      expect(mockGenerateDemoCode).toHaveBeenCalledWith(
        {
          title: "Test Title",
          concept: "Test concept",
          visualization: "Test viz",
          interaction: "Test interaction",
          wowFactor: "Amazing animation",
        },
        undefined, // userId from context
      );
    });
  });

  describe("JavaScript validation", () => {
    it("returns error when generated JS is unsafe", async () => {
      mockGenerateDemoCode.mockResolvedValue({
        html: "<div>Demo</div>",
        css: ".demo {}",
        js: 'eval("dangerous")',
      });
      mockValidateCode.mockReturnValue({
        safe: false,
        violations: ["Eval execution"],
      });

      const result = await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining("unsafe patterns"),
      });
    });

    it("accepts code without JS", async () => {
      mockGenerateDemoCode.mockResolvedValue({
        html: "<div>Static Demo</div>",
        css: ".demo {}",
        js: undefined,
      });

      const result = await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      });

      expect(result).toMatchObject({
        success: true,
      });
      expect(mockValidateCode).not.toHaveBeenCalled();
    });

    it("accepts code with empty JS string", async () => {
      mockGenerateDemoCode.mockResolvedValue({
        html: "<div>Demo</div>",
        css: ".demo {}",
        js: "",
      });

      const result = await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      });

      // Empty string is falsy so validateCode is not called
      expect(result).toMatchObject({
        success: true,
      });
    });
  });

  describe("success path", () => {
    it("returns success with sanitized data", async () => {
      mockSanitizeHtml.mockResolvedValue("<div>Sanitized Demo</div>");

      const result = (await capturedHandler.get()!({
        title: "  Test Title  ",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      })) as {
        success: boolean;
        data: {
          title: string;
          description: string;
          html: string;
          css: string;
          js: string;
        };
      };

      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Test Title"); // Trimmed
      expect(result.data.description).toBe("Test concept: Test viz");
      expect(result.data.html).toBe("<div>Sanitized Demo</div>");
      expect(result.data.css).toBe(".demo { color: red; }");
      expect(result.data.js).toBe('console.log("demo");');
    });

    it("includes toolId and toolType in result", async () => {
      const result = (await capturedHandler.get()!({
        title: "Test Title",
        concept: "Test concept",
        visualization: "Test viz",
        interaction: "Test interaction",
      })) as { toolId: string; toolType: string };

      expect(result.toolId).toBe("test-id-123");
      expect(result.toolType).toBe("demo");
    });
  });
});
