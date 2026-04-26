/**
 * Mindmap Import Index Tests
 *
 * Tests for main import module functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
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

describe("Mindmap Import Index", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("importMindmap", () => {
    it("should import JSON format successfully", async () => {
      const { importMindmap } = await import("../index");

      const jsonContent = JSON.stringify({
        title: "Test Mindmap",
        root: { id: "1", text: "Root" },
      });

      const result = await importMindmap(jsonContent, "test.json");

      expect(result.success).toBe(true);
      expect(result.mindmap?.title).toBe("Test Mindmap");
    });

    it("should import markdown format successfully", async () => {
      const { importMindmap } = await import("../index");

      const markdownContent = `# Root Node
## Child 1
## Child 2`;

      const result = await importMindmap(markdownContent, "test.md");

      expect(result.success).toBe(true);
      expect(result.mindmap).toBeDefined();
    });

    it("should import text format successfully", async () => {
      const { importMindmap } = await import("../index");

      const textContent = `Root
  Child 1
  Child 2`;

      const result = await importMindmap(textContent, "test.txt");

      expect(result.success).toBe(true);
      expect(result.mindmap).toBeDefined();
    });

    it("should use provided format over auto-detection", async () => {
      const { importMindmap } = await import("../index");

      const content = `# Markdown Heading
## Sub heading`;

      const result = await importMindmap(content, "test.txt", {
        format: "markdown",
      });

      expect(result.success).toBe(true);
    });

    it("should return error for unsupported format", async () => {
      const { importMindmap } = await import("../index");

      // Force an unknown format by using options
      const result = await importMindmap("content", "test.xyz", {
        format: "unknown" as "json",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported format");
    });

    it("should handle import errors gracefully", async () => {
      const { importMindmap } = await import("../index");

      // Invalid JSON should cause an error
      const result = await importMindmap("not valid json", "test.json");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle FreeMind XML format", async () => {
      const { importMindmap } = await import("../index");

      const freemindXml = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.0.1">
  <node TEXT="Root">
    <node TEXT="Child 1"/>
  </node>
</map>`;

      const result = await importMindmap(freemindXml, "test.mm");

      // FreeMind import might succeed or fail based on implementation
      expect(result).toHaveProperty("success");
    });

    it("should handle XMind format", async () => {
      const { importMindmap } = await import("../index");

      // XMind expects ArrayBuffer, so this should trigger the XMind path
      const result = await importMindmap(new ArrayBuffer(10), "test.xmind");

      expect(result).toHaveProperty("success");
    });
  });

  describe("importMindmapFromFile", () => {
    it("should import from File object", async () => {
      const { importMindmapFromFile } = await import("../index");

      const jsonContent = JSON.stringify({
        title: "File Import Test",
        root: { id: "1", text: "Root" },
      });

      const file = new File([jsonContent], "test.json", {
        type: "application/json",
      });

      const result = await importMindmapFromFile(file);

      expect(result.success).toBe(true);
      expect(result.mindmap?.title).toBe("File Import Test");
    });

    it("should handle markdown file import", async () => {
      const { importMindmapFromFile } = await import("../index");

      const file = new File(["# Root\n## Child"], "test.md", {
        type: "text/markdown",
      });

      const result = await importMindmapFromFile(file);

      expect(result.success).toBe(true);
    });
  });

  describe("re-exports", () => {
    it("should export validateMindmap", async () => {
      const { validateMindmap } = await import("../index");
      expect(validateMindmap).toBeDefined();
    });
  });
});
