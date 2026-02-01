/**
 * Mindmap Export Index Tests
 *
 * Tests for main export module functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MindmapData, ExportResult } from "../types";

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

// Store original window
const originalWindow = global.window;

describe("Mindmap Export Index", () => {
  const sampleMindmap: MindmapData = {
    title: "Test Mindmap",
    topic: "Testing",
    root: {
      id: "root-1",
      text: "Root Node",
      children: [{ id: "child-1", text: "Child 1" }],
    },
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe("downloadExport", () => {
    it("should throw error when window is undefined", async () => {
      // @ts-expect-error - Testing undefined window
      global.window = undefined;

      const { downloadExport } = await import("../index");

      const mockResult: ExportResult = {
        blob: new Blob(["test"], { type: "text/plain" }),
        filename: "test.txt",
        mimeType: "text/plain",
      };

      expect(() => downloadExport(mockResult)).toThrow(
        "Download requires browser environment",
      );
    });
  });

  describe("exportMindmap", () => {
    it("should throw error for svg format without browser", async () => {
      // @ts-expect-error - Testing undefined window
      global.window = undefined;

      const { exportMindmap } = await import("../index");

      await expect(
        exportMindmap(sampleMindmap, { format: "svg" }),
      ).rejects.toThrow("SVG export requires browser environment");
    });

    it("should throw error for png format without browser", async () => {
      // @ts-expect-error - Testing undefined window
      global.window = undefined;

      const { exportMindmap } = await import("../index");

      await expect(
        exportMindmap(sampleMindmap, { format: "png" }),
      ).rejects.toThrow("PNG export requires browser environment");
    });

    it("should export svg format successfully with browser", async () => {
      global.window = {} as Window & typeof globalThis;
      global.document = {
        querySelector: vi.fn().mockReturnValue(null),
      } as unknown as Document;

      const { exportMindmap } = await import("../index");

      const result = await exportMindmap(sampleMindmap, { format: "svg" });

      expect(result.filename).toBe("Test_Mindmap.svg");
      expect(result.mimeType).toBe("image/svg+xml");
    });

    it("should export pdf format successfully", async () => {
      const { exportMindmap } = await import("../index");

      const result = await exportMindmap(sampleMindmap, { format: "pdf" });

      expect(result.filename).toBe("Test_Mindmap.pdf");
      expect(result.mimeType).toBe("application/pdf");
    });
  });
});
