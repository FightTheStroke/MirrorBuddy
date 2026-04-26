/**
 * Tests for Diagram Plugin
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { diagramPlugin } from "../diagram-plugin";
import {
  ToolCategory,
  Permission,
  type VoicePromptConfig,
} from "../../plugin/types";

// Extract schema for testing
const DiagramPluginSchema = z.object({
  topic: z
    .string()
    .min(1, "Topic is required")
    .max(200, "Topic must be under 200 characters"),
  diagramType: z
    .enum(["flowchart", "sequence", "class", "er"])
    .default("flowchart"),
  mermaidCode: z
    .string()
    .min(10, "Mermaid code must be at least 10 characters"),
});

describe("diagram-plugin", () => {
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

    it("has voice triggers", () => {
      expect(diagramPlugin.triggers).toContain("diagramma");
      expect(diagramPlugin.triggers).toContain("flowchart");
      expect(diagramPlugin.triggers).toContain("mermaid");
    });

    it("is voice enabled", () => {
      expect(diagramPlugin.voiceEnabled).toBe(true);
    });

    it("has voice prompt with topic placeholder", () => {
      const voicePrompt = diagramPlugin.voicePrompt as VoicePromptConfig;
      expect(voicePrompt.template).toContain("{topic}");
      expect(voicePrompt.requiresContext).toContain("topic");
    });

    it("has voice feedback with diagramType", () => {
      const voiceFeedback = diagramPlugin.voiceFeedback as VoicePromptConfig;
      expect(voiceFeedback.template).toContain("{diagramType}");
      expect(voiceFeedback.requiresContext).toContain("diagramType");
    });

    it("has no prerequisites", () => {
      expect(diagramPlugin.prerequisites).toEqual([]);
    });

    it("has handler function", () => {
      expect(typeof diagramPlugin.handler).toBe("function");
    });
  });

  describe("schema validation", () => {
    it("accepts valid input", () => {
      const result = DiagramPluginSchema.safeParse({
        topic: "Software Architecture",
        diagramType: "flowchart",
        mermaidCode: "flowchart TD\n  A-->B",
      });
      expect(result.success).toBe(true);
    });

    it("applies default diagram type", () => {
      const result = DiagramPluginSchema.safeParse({
        topic: "Test",
        mermaidCode: "flowchart TD\n  A-->B",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).diagramType).toBe("flowchart");
      }
    });

    it("rejects empty topic", () => {
      const result = DiagramPluginSchema.safeParse({
        topic: "",
        mermaidCode: "flowchart TD\n  A-->B",
      });
      expect(result.success).toBe(false);
    });

    it("rejects topic exceeding max length", () => {
      const result = DiagramPluginSchema.safeParse({
        topic: "a".repeat(201),
        mermaidCode: "flowchart TD\n  A-->B",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid diagram types", () => {
      const validTypes = ["flowchart", "sequence", "class", "er"];
      for (const type of validTypes) {
        const result = DiagramPluginSchema.safeParse({
          topic: "Test",
          diagramType: type,
          mermaidCode: "graph TD\n  A-->B-->C",
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid diagram type", () => {
      const result = DiagramPluginSchema.safeParse({
        topic: "Test",
        diagramType: "invalid",
        mermaidCode: "graph TD\n  A-->B",
      });
      expect(result.success).toBe(false);
    });

    it("rejects mermaid code under minimum length", () => {
      const result = DiagramPluginSchema.safeParse({
        topic: "Test",
        mermaidCode: "short",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid mermaid code at minimum length", () => {
      const result = DiagramPluginSchema.safeParse({
        topic: "Test",
        mermaidCode: "graph TD A",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("voice triggers", () => {
    it("includes Italian and English triggers", () => {
      expect(diagramPlugin.triggers).toContain("diagramma");
      expect(diagramPlugin.triggers).toContain("crea diagramma");
      expect(diagramPlugin.triggers).toContain("diagram");
      expect(diagramPlugin.triggers).toContain("schema");
      expect(diagramPlugin.triggers).toContain("grafico");
    });
  });
});
