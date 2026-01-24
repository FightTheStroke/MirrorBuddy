/**
 * Tests for Homework Plugin
 * Coverage improvement for tools/plugins/homework-plugin.ts
 * Tests plugin configuration, schema validation, and voice triggers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/homework-handler", () => ({
  analyzeHomework: vi.fn(() =>
    Promise.resolve({
      exerciseType: "math",
      problemStatement: "Solve for x",
      givenData: ["x + 2 = 5"],
      topic: "algebra",
      difficulty: "easy",
      hints: ["Subtract 2 from both sides"],
    }),
  ),
  extractTextFromImage: vi.fn(() =>
    Promise.resolve("Extracted text from image"),
  ),
}));

vi.mock("../../handlers/study-kit-handler", () => ({
  extractTextFromPDF: vi.fn(() =>
    Promise.resolve({ text: "Extracted text from PDF" }),
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

import { homeworkPlugin } from "../homework-plugin";
import type { ToolContext } from "@/types/tools";

describe("homework-plugin", () => {
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
      expect(homeworkPlugin.id).toBe("homework_help");
    });

    it("has correct name", () => {
      expect(homeworkPlugin.name).toBe("Aiuto Compiti");
    });

    it("has correct category", () => {
      expect(homeworkPlugin.category).toBe(ToolCategory.EDUCATIONAL);
    });

    it("has required permissions", () => {
      expect(homeworkPlugin.permissions).toContain(Permission.FILE_ACCESS);
      expect(homeworkPlugin.permissions).toContain(
        Permission.READ_CONVERSATION,
      );
      expect(homeworkPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(homeworkPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("has voice triggers in Italian and English", () => {
      expect(homeworkPlugin.triggers).toContain("aiuto compiti");
      expect(homeworkPlugin.triggers).toContain("aiutami con");
      expect(homeworkPlugin.triggers).toContain("esercizio");
      expect(homeworkPlugin.triggers).toContain("homework");
      expect(homeworkPlugin.triggers).toContain("homework help");
      expect(homeworkPlugin.triggers).toContain("compiti");
      expect(homeworkPlugin.triggers).toContain("problema");
    });

    it("is voice enabled", () => {
      expect(homeworkPlugin.voiceEnabled).toBe(true);
    });

    it("has no prerequisites", () => {
      expect(homeworkPlugin.prerequisites).toEqual([]);
    });

    it("has handler function", () => {
      expect(typeof homeworkPlugin.handler).toBe("function");
    });

    it("has voice prompt", () => {
      expect(homeworkPlugin.voicePrompt).toBeDefined();
      if (typeof homeworkPlugin.voicePrompt === "object") {
        expect(homeworkPlugin.voicePrompt.template).toBeDefined();
        expect(homeworkPlugin.voicePrompt.fallback).toBeDefined();
      }
    });

    it("has voice feedback", () => {
      expect(homeworkPlugin.voiceFeedback).toBeDefined();
      if (typeof homeworkPlugin.voiceFeedback === "object") {
        expect(homeworkPlugin.voiceFeedback.template).toBeDefined();
        expect(homeworkPlugin.voiceFeedback.fallback).toBeDefined();
      }
    });
  });

  describe("handler - text input", () => {
    it("processes text input successfully", async () => {
      const result = await homeworkPlugin.handler(
        { text: "Solve x + 2 = 5" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sourceType).toBe("text");
      expect((result.data as any).exerciseType).toBe("math");
    });

    it("returns homework data structure", async () => {
      const result = await homeworkPlugin.handler(
        { text: "Find the derivative of f(x) = x^2" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("type", "homework");
      expect(result.data).toHaveProperty("exerciseType");
      expect(result.data).toHaveProperty("problemStatement");
    });
  });

  describe("handler - PDF input", () => {
    it("processes PDF input successfully", async () => {
      const pdfBase64 = Buffer.from("mock pdf content").toString("base64");
      const result = await homeworkPlugin.handler(
        { fileData: pdfBase64, fileType: "pdf" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sourceType).toBe("pdf");
    });

    it("handles PDF as ArrayBuffer", async () => {
      const pdfBuffer = new ArrayBuffer(10);
      const result = await homeworkPlugin.handler(
        { fileData: pdfBuffer as unknown as string, fileType: "pdf" },
        mockContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe("handler - image input", () => {
    it("processes image input successfully", async () => {
      const imageData = "data:image/jpeg;base64,/9j/4AAQ...";
      const result = await homeworkPlugin.handler(
        { fileData: imageData, fileType: "image" },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).sourceType).toBe("image");
    });

    it("converts ArrayBuffer to data URL for images", async () => {
      const imageBuffer = new ArrayBuffer(10);
      const result = await homeworkPlugin.handler(
        { fileData: imageBuffer as unknown as string, fileType: "image" },
        mockContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe("schema validation", () => {
    const HomeworkInputSchema = z.object({
      text: z.string().optional(),
      fileData: z.union([z.string(), z.instanceof(ArrayBuffer)]).optional(),
      fileType: z.enum(["pdf", "image"]).optional(),
    });

    it("accepts text only", () => {
      const result = HomeworkInputSchema.safeParse({ text: "Some exercise" });
      expect(result.success).toBe(true);
    });

    it("accepts pdf file data", () => {
      const result = HomeworkInputSchema.safeParse({
        fileData: "base64data",
        fileType: "pdf",
      });
      expect(result.success).toBe(true);
    });

    it("accepts image file data", () => {
      const result = HomeworkInputSchema.safeParse({
        fileData: "base64data",
        fileType: "image",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = HomeworkInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects invalid fileType", () => {
      const result = HomeworkInputSchema.safeParse({
        fileData: "data",
        fileType: "doc",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("voice triggers", () => {
    it("has at least 7 triggers", () => {
      expect(homeworkPlugin.triggers.length).toBeGreaterThanOrEqual(7);
    });

    it("includes Italian triggers", () => {
      const italianTriggers = [
        "aiuto compiti",
        "aiutami con",
        "esercizio",
        "compiti",
        "problema",
      ];
      italianTriggers.forEach((trigger) => {
        expect(homeworkPlugin.triggers).toContain(trigger);
      });
    });

    it("includes English triggers", () => {
      const englishTriggers = [
        "homework",
        "homework help",
        "problem",
        "help homework",
      ];
      englishTriggers.forEach((trigger) => {
        expect(homeworkPlugin.triggers).toContain(trigger);
      });
    });
  });
});
