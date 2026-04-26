/**
 * Tests for Webcam Plugin
 * Coverage improvement for tools/plugins/webcam-plugin.ts
 * Tests plugin configuration, schema validation, and handler branches
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { ToolCategory, Permission } from "../../plugin/types";

// Mock dependencies
vi.mock("../../handlers/webcam-handler", () => ({
  analyzeImageWithVision: vi.fn(() =>
    Promise.resolve({
      text: "Extracted text from image",
      description: "A whiteboard with mathematical equations",
    }),
  ),
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

import { webcamPlugin } from "../webcam-plugin";
import { analyzeImageWithVision } from "../../handlers/webcam-handler";
import type { ToolContext } from "@/types/tools";

describe("webcam-plugin", () => {
  const mockContext: ToolContext = {
    conversationId: "conv-123",
    userId: "user-456",
    sessionId: "sess-789",
    maestroId: "euclide",
  };

  const validDataUrl =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAM";
  const validBase64 = "SGVsbG8gV29ybGQ=";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("has correct id", () => {
      expect(webcamPlugin.id).toBe("capture_webcam");
    });

    it("has correct name", () => {
      expect(webcamPlugin.name).toBe("Scatta Foto");
    });

    it("has correct category", () => {
      expect(webcamPlugin.category).toBe(ToolCategory.CREATION);
    });

    it("has required permissions", () => {
      expect(webcamPlugin.permissions).toContain(Permission.FILE_ACCESS);
      expect(webcamPlugin.permissions).toContain(Permission.WRITE_CONTENT);
      expect(webcamPlugin.permissions).toContain(Permission.VOICE_OUTPUT);
    });

    it("has voice triggers in Italian and English", () => {
      expect(webcamPlugin.triggers).toContain("scatta foto");
      expect(webcamPlugin.triggers).toContain("fotografa");
      expect(webcamPlugin.triggers).toContain("take photo");
      expect(webcamPlugin.triggers).toContain("capture");
      expect(webcamPlugin.triggers).toContain("webcam");
    });

    it("is voice enabled", () => {
      expect(webcamPlugin.voiceEnabled).toBe(true);
    });

    it("has no prerequisites", () => {
      expect(webcamPlugin.prerequisites).toEqual([]);
    });

    it("has handler function", () => {
      expect(typeof webcamPlugin.handler).toBe("function");
    });

    it("has voice prompt", () => {
      expect(webcamPlugin.voicePrompt).toBeDefined();
      if (typeof webcamPlugin.voicePrompt === "object") {
        expect(webcamPlugin.voicePrompt.fallback).toBeDefined();
      }
    });

    it("has voice feedback", () => {
      expect(webcamPlugin.voiceFeedback).toBeDefined();
      if (typeof webcamPlugin.voiceFeedback === "object") {
        expect(webcamPlugin.voiceFeedback.fallback).toBeDefined();
      }
    });
  });

  describe("handler - success cases", () => {
    it("processes data URL format successfully", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: validDataUrl },
        mockContext,
      );

      expect(result.success).toBe(true);
      expect((result.data as any).imageBase64).toBe(validDataUrl);
      expect((result.data as any).extractedText).toBe(
        "Extracted text from image",
      );
      expect((result.data as any).imageDescription).toBe(
        "A whiteboard with mathematical equations",
      );
      expect((result.data as any).analysisTimestamp).toBeDefined();
    });

    it("processes raw base64 format successfully", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: validBase64 },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it("accepts data URL with jpeg", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: "data:image/jpeg;base64,abc123==" },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it("accepts data URL with jpg", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: "data:image/jpg;base64,abc123==" },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it("accepts data URL with png", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: "data:image/png;base64,abc123==" },
        mockContext,
      );

      expect(result.success).toBe(true);
    });

    it("accepts data URL with gif", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: "data:image/gif;base64,abc123==" },
        mockContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe("handler - validation errors", () => {
    it("rejects empty imageBase64", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: "" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });

    it("rejects missing imageBase64", async () => {
      const result = await webcamPlugin.handler({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("rejects invalid base64 format with special chars", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: "invalid!@#$%^&*()" },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid base64 image format");
    });

    it("rejects invalid data URL mime type", async () => {
      const result = await webcamPlugin.handler(
        { imageBase64: "data:text/plain;base64,abc123" },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("handler - vision API errors", () => {
    it("handles vision API throwing an error", async () => {
      vi.mocked(analyzeImageWithVision).mockRejectedValueOnce(
        new Error("Vision API quota exceeded"),
      );

      const result = await webcamPlugin.handler(
        { imageBase64: validDataUrl },
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Vision API quota exceeded");
    });

    it("handles non-Error exception", async () => {
      vi.mocked(analyzeImageWithVision).mockRejectedValueOnce("string error");

      const result = await webcamPlugin.handler(
        { imageBase64: validDataUrl },
        mockContext,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("schema validation", () => {
    const WebcamInputSchema = z.object({
      imageBase64: z.string().min(1),
    });

    it("accepts valid base64 string", () => {
      const result = WebcamInputSchema.safeParse({ imageBase64: "abc123==" });
      expect(result.success).toBe(true);
    });

    it("rejects empty string", () => {
      const result = WebcamInputSchema.safeParse({ imageBase64: "" });
      expect(result.success).toBe(false);
    });

    it("rejects non-string value", () => {
      const result = WebcamInputSchema.safeParse({ imageBase64: 123 });
      expect(result.success).toBe(false);
    });
  });

  describe("voice triggers", () => {
    it("has at least 9 triggers", () => {
      expect(webcamPlugin.triggers.length).toBeGreaterThanOrEqual(9);
    });

    it("includes Italian triggers", () => {
      const italianTriggers = [
        "scatta foto",
        "fotografa",
        "fai una foto",
        "foto",
        "fotografia",
        "scatta",
      ];
      italianTriggers.forEach((trigger) => {
        expect(webcamPlugin.triggers).toContain(trigger);
      });
    });

    it("includes English triggers", () => {
      const englishTriggers = ["take photo", "capture", "webcam"];
      englishTriggers.forEach((trigger) => {
        expect(webcamPlugin.triggers).toContain(trigger);
      });
    });
  });
});
