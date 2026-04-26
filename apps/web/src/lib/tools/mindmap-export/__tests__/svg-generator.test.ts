/**
 * SVG Generator Tests
 *
 * Tests for mindmap SVG export functionality.
 * Note: Full browser functionality tests are limited due to DOM requirements.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MindmapData } from "../types";

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

describe("SVG Generator", () => {
  const sampleMindmap: MindmapData = {
    title: "Test Mindmap",
    topic: "Testing",
    root: {
      id: "root-1",
      text: "Root Node",
      children: [
        {
          id: "child-1",
          text: "Child 1",
          color: "#ff0000",
          children: [{ id: "grandchild-1", text: "Grandchild 1" }],
        },
        {
          id: "child-2",
          text: "Child 2",
        },
      ],
    },
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe("exportAsSVG", () => {
    it("should throw error when window is undefined", async () => {
      // @ts-expect-error - Testing undefined window
      global.window = undefined;

      const { exportAsSVG } = await import("../svg-generator");

      expect(() => exportAsSVG(sampleMindmap, "test")).toThrow(
        "SVG export requires browser environment",
      );
    });

    it("should generate simple SVG when no markmap element exists", async () => {
      global.window = {} as Window & typeof globalThis;
      global.document = {
        querySelector: vi.fn().mockReturnValue(null),
      } as unknown as Document;

      const { exportAsSVG } = await import("../svg-generator");

      const result = exportAsSVG(sampleMindmap, "test-mindmap");

      expect(result.filename).toBe("test-mindmap.svg");
      expect(result.mimeType).toBe("image/svg+xml");
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it("should include XML declaration in generated SVG", async () => {
      global.window = {} as Window & typeof globalThis;
      global.document = {
        querySelector: vi.fn().mockReturnValue(null),
      } as unknown as Document;

      const { exportAsSVG } = await import("../svg-generator");

      const result = exportAsSVG(sampleMindmap, "test");
      const svgContent = await result.blob.text();

      expect(svgContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svgContent).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    });

    it("should include node text in generated SVG", async () => {
      global.window = {} as Window & typeof globalThis;
      global.document = {
        querySelector: vi.fn().mockReturnValue(null),
      } as unknown as Document;

      const { exportAsSVG } = await import("../svg-generator");

      const result = exportAsSVG(sampleMindmap, "test");
      const svgContent = await result.blob.text();

      expect(svgContent).toContain("Root Node");
      expect(svgContent).toContain("Child 1");
      expect(svgContent).toContain("Child 2");
    });

    it("should include CSS styling in generated SVG", async () => {
      global.window = {} as Window & typeof globalThis;
      global.document = {
        querySelector: vi.fn().mockReturnValue(null),
      } as unknown as Document;

      const { exportAsSVG } = await import("../svg-generator");

      const result = exportAsSVG(sampleMindmap, "test");
      const svgContent = await result.blob.text();

      expect(svgContent).toContain("<style>");
      expect(svgContent).toContain("font-family:");
      expect(svgContent).toContain(".root");
    });
  });

  describe("exportAsPNG", () => {
    it("should throw error when window is undefined", async () => {
      // @ts-expect-error - Testing undefined window
      global.window = undefined;

      const { exportAsPNG } = await import("../svg-generator");

      await expect(exportAsPNG(sampleMindmap, "test")).rejects.toThrow(
        "PNG export requires browser environment",
      );
    });
  });
});
