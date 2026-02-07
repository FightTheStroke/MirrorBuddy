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
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/lib/tier/tier-service", () => ({
  tierService: {
    getFeatureAIConfigForUser: vi.fn(() =>
      Promise.resolve({
        model: "gpt-4o",
        temperature: 0.8,
        maxTokens: 4000,
      }),
    ),
  },
}));

vi.mock("@/lib/ai/providers/deployment-mapping", () => ({
  getDeploymentForModel: vi.fn((model: string) => model),
}));

import { demoPlugin } from "../demo-plugin";
import { chatCompletion } from "@/lib/ai/server";

// Extract schema for testing - matches OpenAI function definition
const DemoInputSchema = z.object({
  title: z.string().min(1).max(100),
  concept: z.string().min(1).max(500),
  visualization: z.string().min(1).max(500),
  interaction: z.string().min(1).max(500),
  wowFactor: z.string().max(200).optional(),
});

// Valid input for handler tests
const validInput = {
  title: "Gravity Demo",
  concept: "Newton's laws of gravity",
  visualization: "Falling objects with trail effects",
  interaction: "Click to drop objects from different heights",
};

describe("demo-plugin", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "galileo",
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

    it("has voice prompt with concept placeholder", () => {
      const voicePrompt = demoPlugin.voicePrompt as VoicePromptConfig;
      expect(voicePrompt.template).toContain("{concept}");
      expect(voicePrompt.requiresContext).toContain("concept");
    });

    it("has voice feedback configuration", () => {
      const voiceFeedback = demoPlugin.voiceFeedback as VoicePromptConfig;
      expect(voiceFeedback.template).toContain("{concept}");
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
    it("accepts valid input with all required fields", () => {
      const result = DemoInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("accepts full input with optional wowFactor", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        wowFactor: "Glowing particles",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        title: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects title exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        title: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty concept", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        concept: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects concept exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        concept: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty visualization", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        visualization: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects visualization exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        visualization: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty interaction", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        interaction: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects interaction exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        interaction: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects wowFactor exceeding max length", () => {
      const result = DemoInputSchema.safeParse({
        ...validInput,
        wowFactor: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing required fields", () => {
      const result = DemoInputSchema.safeParse({
        title: "Test",
      });
      expect(result.success).toBe(false);
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
    it("creates demo with all required fields", async () => {
      const result = await demoPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).id).toBe("demo-test-id");
      expect((result.data as Record<string, unknown>).title).toBe(
        "Gravity Demo",
      );
    });

    it("creates demo with optional wowFactor", async () => {
      const result = await demoPlugin.handler(
        {
          ...validInput,
          wowFactor: "Amazing effects!",
        },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).title).toBe(
        "Gravity Demo",
      );
    });

    it("includes description from concept and visualization", async () => {
      const result = await demoPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).description).toContain(
        "Newton's laws of gravity",
      );
    });
  });

  describe("handler - code generation failure", () => {
    it("returns error when code generation returns null (no JSON)", async () => {
      vi.mocked(chatCompletion).mockResolvedValueOnce({
        content: "Invalid response without JSON",
        provider: "azure",
        model: "gpt-4",
      });

      const result = await demoPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Non è stato possibile generare");
    });

    it("handles chatCompletion throwing an error", async () => {
      vi.mocked(chatCompletion).mockRejectedValueOnce(new Error("API error"));

      const result = await demoPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
    });

    it("handles malformed JSON in response", async () => {
      vi.mocked(chatCompletion).mockResolvedValueOnce({
        content: "{invalid json syntax here}",
        provider: "azure",
        model: "gpt-4",
      });

      const result = await demoPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
    });
  });

  describe("handler - validation errors", () => {
    it("rejects missing required fields", async () => {
      const result = await demoPlugin.handler({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Errore");
    });

    it("rejects title over 100 characters", async () => {
      const result = await demoPlugin.handler(
        { ...validInput, title: "a".repeat(101) },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects concept over 500 characters", async () => {
      const result = await demoPlugin.handler(
        { ...validInput, concept: "a".repeat(501) },
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

      const result = await demoPlugin.handler(validInput, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
