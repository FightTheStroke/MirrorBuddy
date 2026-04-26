/**
 * Tests for Diagram Plugin Handler
 * Coverage improvement for tools/plugins/diagram-plugin.ts
 * Tests handler branches and Mermaid validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/diagram-handler", () => ({
  validateMermaidCode: vi.fn(() => ({ valid: true })),
}));

import { diagramPlugin } from "../diagram-plugin";
import { validateMermaidCode } from "../../handlers/diagram-handler";
import type { ToolContext } from "@/types/tools";

describe("diagram-plugin handler", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "galileo",
  };

  const validInput = {
    topic: "Algorithm Flow",
    diagramType: "flowchart" as const,
    mermaidCode: "flowchart TD\n  A[Start] --> B[End]",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateMermaidCode).mockReturnValue({ valid: true });
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(diagramPlugin.id).toBe("create_diagram");
    });

    it("has correct name", () => {
      expect(diagramPlugin.name).toBe("Diagramma");
    });

    it("has correct category", () => {
      expect(diagramPlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(diagramPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(diagramPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("is voice enabled", () => {
      expect(diagramPlugin.voiceEnabled).toBe(true);
    });

    it("has voice triggers", () => {
      expect(diagramPlugin.triggers).toContain("diagramma");
      expect(diagramPlugin.triggers).toContain("flowchart");
      expect(diagramPlugin.triggers).toContain("diagram");
      expect(diagramPlugin.triggers).toContain("mermaid");
    });

    it("has voice prompt with topic placeholder", () => {
      expect(diagramPlugin.voicePrompt).toBeDefined();
      if (typeof diagramPlugin.voicePrompt === "object") {
        expect(diagramPlugin.voicePrompt.template).toContain("{topic}");
      }
    });

    it("has voice feedback with diagramType placeholder", () => {
      expect(diagramPlugin.voiceFeedback).toBeDefined();
      if (typeof diagramPlugin.voiceFeedback === "object") {
        expect(diagramPlugin.voiceFeedback.template).toContain("{diagramType}");
      }
    });
  });

  describe("handler - success cases", () => {
    it("creates diagram with all fields", async () => {
      const result = await diagramPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(true);
      expect((result.data as any).topic).toBe("Algorithm Flow");
      expect((result.data as any).diagramType).toBe("flowchart");
      expect((result.data as any).mermaidCode).toBeDefined();
      expect((result.data as any).createdAt).toBeDefined();
    });

    it("trims topic and mermaidCode", async () => {
      const result = await diagramPlugin.handler(
        {
          ...validInput,
          topic: "  Spaced Topic  ",
          mermaidCode: "  flowchart TD\n  A --> B  ",
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).topic).toBe("Spaced Topic");
      expect((result.data as any).mermaidCode).toBe("flowchart TD\n  A --> B");
    });

    it("uses default diagramType (flowchart) when not provided", async () => {
      const result = await diagramPlugin.handler(
        { topic: "Test", mermaidCode: "flowchart TD\n  A --> B" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).diagramType).toBe("flowchart");
    });
  });

  describe("handler - all diagram types", () => {
    const diagramTypes = ["flowchart", "sequence", "class", "er"] as const;

    it.each(diagramTypes)("accepts diagramType: %s", async (diagramType) => {
      const result = await diagramPlugin.handler(
        { ...validInput, diagramType },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).diagramType).toBe(diagramType);
    });
  });

  describe("handler - Mermaid validation errors", () => {
    it("returns error when Mermaid code is invalid", async () => {
      vi.mocked(validateMermaidCode).mockReturnValueOnce({
        valid: false,
        error: "Invalid Mermaid syntax at line 1",
      });

      const result = await diagramPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid Mermaid syntax");
    });

    it("returns default error when validation fails without message", async () => {
      vi.mocked(validateMermaidCode).mockReturnValueOnce({ valid: false });

      const result = await diagramPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid Mermaid code");
    });
  });

  describe("handler - schema validation errors", () => {
    it("rejects missing topic", async () => {
      const result = await diagramPlugin.handler(
        { mermaidCode: "flowchart TD\n  A --> B" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("rejects empty topic", async () => {
      const result = await diagramPlugin.handler(
        { topic: "", mermaidCode: "flowchart TD\n  A --> B" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Topic is required");
    });

    it("rejects topic over 200 characters", async () => {
      const result = await diagramPlugin.handler(
        { topic: "a".repeat(201), mermaidCode: "flowchart TD\n  A --> B" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects missing mermaidCode", async () => {
      const result = await diagramPlugin.handler(
        { topic: "Test" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects mermaidCode under 10 characters", async () => {
      const result = await diagramPlugin.handler(
        { topic: "Test", mermaidCode: "short" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 10 characters");
    });

    it("rejects invalid diagramType", async () => {
      const result = await diagramPlugin.handler(
        { ...validInput, diagramType: "invalid" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("handler - error handling", () => {
    it("handles non-Error exception", async () => {
      vi.mocked(validateMermaidCode).mockImplementationOnce(() => {
        throw "string error";
      });

      const result = await diagramPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Diagram creation failed");
    });

    it("handles Error exception", async () => {
      vi.mocked(validateMermaidCode).mockImplementationOnce(() => {
        throw new Error("Validation crashed");
      });

      const result = await diagramPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation crashed");
    });
  });
});
