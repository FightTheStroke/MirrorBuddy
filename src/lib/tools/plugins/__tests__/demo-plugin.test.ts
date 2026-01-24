/**
 * Tests for Demo Plugin
 * Coverage improvement for tools/plugins/demo-plugin.ts
 * Tests plugin configuration, schema validation, and handler branches
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  ToolCategory,
  Permission,
  type VoicePromptConfig,
} from "../../plugin/types";
import type { ToolContext } from "@/types/tools";

// Mock dependencies
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "demo-test-id"),
}));

vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(() =>
    Promise.resolve({
      content:
        '{"html":"<div>Demo</div>","css":".demo{color:red;}","js":"console.log(1);"}',
    }),
  ),
}));

vi.mock("../handlers/demo-handler", () => ({
  sanitizeHtml: vi.fn((html: string) => Promise.resolve(html)),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { demoPlugin } from "../demo-plugin";
import { chatCompletion } from "@/lib/ai/providers";

// Extract schema for testing
const DemoInputSchema = z.object({
  topic: z.string().min(1).max(200),
  type: z
    .enum(["simulation", "visualization", "experiment"])
    .optional()
    .default("visualization"),
  title: z.string().min(1).max(100).optional(),
  concept: z.string().min(1).max(500).optional(),
  visualization: z.string().min(1).max(500).optional(),
  interaction: z.string().min(1).max(500).optional(),
  wowFactor: z.string().max(200).optional(),
});

describe("demo-plugin", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "galileo",
    studentAge: 14,
    studentName: "Marco",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(demoPlugin.id).toBe("create_demo");
    });

    it("has correct name", () => {
      expect(demoPlugin.name).toBe("Demo Interattiva");
    });

    it("has correct category", () => {
      expect(demoPlugin.category).toBe(ToolCategory.EDUCATIONAL);
    });

    it("has required permissions", () => {
      expect(demoPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(demoPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("has voice triggers", () => {
      expect(demoPlugin.triggers).toContain("demo");
      expect(demoPlugin.triggers).toContain("mostra demo");
      expect(demoPlugin.triggers).toContain("simulazione");
    });

    it("is voice enabled", () => {
      expect(demoPlugin.voiceEnabled).toBe(true);
    });

    it("has voice prompt with topic placeholder", () => {
      const voicePrompt = demoPlugin.voicePrompt as VoicePromptConfig;
      expect(voicePrompt.template).toContain("{topic}");
      expect(voicePrompt.requiresContext).toContain("topic");
    });

    it("has voice feedback configuration", () => {
      const voiceFeedback = demoPlugin.voiceFeedback as VoicePromptConfig;
      expect(voiceFeedback.template).toContain("{topic}");
      expect(voiceFeedback.fallback).toBeDefined();
    });

    it("has no prerequisites", () => {
      expect(demoPlugin.prerequisites).toEqual([]);
    });

    it("has handler function", () => {
      expect(typeof demoPlugin.handler).toBe("function");
    });

    it("has schema defined", () => {
      expect(demoPlugin.schema).toBeDefined();
    });
  });

  describe("schema validation", () => {
    it("accepts minimal valid input", () => {
      const result = DemoInputSchema.safeParse({
        topic: "Physics gravity",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("visualization"); // default
      }
    });

    it("accepts full input", () => {
      const result = DemoInputSchema.safeParse({
        topic: "Photosynthesis",
        type: "simulation",
        title: "Plant Energy",
        concept: "How plants make food",
        visualization: "Animated cells",
        interaction: "Click leaves",
        wowFactor: "Glowing particles",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty topic", () => {
      const result = DemoInputSchema.safeParse({
        topic: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects topic exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        topic: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid types", () => {
      const validTypes = ["simulation", "visualization", "experiment"];
      for (const type of validTypes) {
        const result = DemoInputSchema.safeParse({ topic: "Test", type });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid type", () => {
      const result = DemoInputSchema.safeParse({
        topic: "Test",
        type: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects title exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        topic: "Test",
        title: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects concept exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        topic: "Test",
        concept: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects wowFactor exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        topic: "Test",
        wowFactor: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("applies default type when not provided", () => {
      const result = DemoInputSchema.safeParse({ topic: "Test" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("visualization");
      }
    });
  });

  describe("voice triggers", () => {
    it("includes Italian triggers", () => {
      const italianTriggers = [
        "demo",
        "mostra demo",
        "esempio",
        "simulazione",
        "visualizza",
        "interattivo",
      ];
      italianTriggers.forEach((trigger) => {
        expect(demoPlugin.triggers).toContain(trigger);
      });
    });
  });

  describe("handler - success cases", () => {
    it("creates demo with required topic only", async () => {
      const result = await demoPlugin.handler(
        { topic: "pendulum motion" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("demo-test-id");
      expect(result.data.topic).toBe("pendulum motion");
      expect(result.data.title).toBe("Demo: pendulum motion");
      expect(result.data.type).toBe("visualization");
    });

    it("creates demo with all optional fields", async () => {
      const result = await demoPlugin.handler(
        {
          topic: "gravity",
          type: "simulation",
          title: "Gravity Simulation",
          concept: "Newton laws",
          visualization: "Falling objects",
          interaction: "Drop objects",
          wowFactor: "Amazing effects!",
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Gravity Simulation");
      expect(result.data.type).toBe("simulation");
    });

    it("creates demo with experiment type", async () => {
      const result = await demoPlugin.handler(
        { topic: "chemistry", type: "experiment" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe("experiment");
    });

    it("includes description from concept and visualization", async () => {
      const result = await demoPlugin.handler(
        {
          topic: "physics",
          concept: "Energy conservation",
          visualization: "Ball bouncing",
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.description).toContain("Energy conservation");
    });
  });

  describe("handler - code generation failure", () => {
    it("returns error when code generation returns null (no JSON)", async () => {
      vi.mocked(chatCompletion).mockResolvedValueOnce({
        content: "Invalid response without JSON",
      });

      const result = await demoPlugin.handler({ topic: "test" }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Non è stato possibile generare");
    });

    it("handles chatCompletion throwing an error", async () => {
      vi.mocked(chatCompletion).mockRejectedValueOnce(new Error("API error"));

      const result = await demoPlugin.handler({ topic: "test" }, mockContext);

      expect(result.success).toBe(false);
    });

    it("handles malformed JSON in response", async () => {
      vi.mocked(chatCompletion).mockResolvedValueOnce({
        content: "{invalid json syntax here}",
      });

      const result = await demoPlugin.handler({ topic: "test" }, mockContext);

      expect(result.success).toBe(false);
    });
  });

  describe("handler - validation errors", () => {
    it("rejects missing topic", async () => {
      const result = await demoPlugin.handler({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Errore");
    });

    it("rejects topic over 200 characters", async () => {
      const result = await demoPlugin.handler(
        { topic: "a".repeat(201) },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects invalid type value", async () => {
      const result = await demoPlugin.handler(
        { topic: "test", type: "invalid" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("handler - error handling", () => {
    it("handles non-Error exception gracefully", async () => {
      vi.mocked(chatCompletion).mockImplementationOnce(() => {
        throw "string error";
      });

      const result = await demoPlugin.handler({ topic: "test" }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
