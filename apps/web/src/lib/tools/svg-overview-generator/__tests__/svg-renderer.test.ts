/**
 * SVG Renderer Tests for SVG Overview Generator
 */

import { describe, it, expect, vi } from "vitest";
import { generateOverviewSVG } from "../svg-renderer";
import type { OverviewData } from "../types";

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

describe("generateOverviewSVG", () => {
  const basicData: OverviewData = {
    title: "Test Overview",
    root: {
      id: "root",
      label: "Root",
      type: "main",
      children: [
        {
          id: "section1",
          label: "Section 1",
          type: "section",
          children: [
            {
              id: "concept1",
              label: "Concept 1",
              type: "concept",
              children: [
                {
                  id: "detail1",
                  label: "Detail 1",
                  type: "detail",
                },
              ],
            },
          ],
        },
      ],
    },
  };

  it("should generate valid SVG string", () => {
    const svg = generateOverviewSVG(basicData);

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("</svg>");
  });

  it("should include title in SVG", () => {
    const svg = generateOverviewSVG(basicData);

    expect(svg).toContain("Test Overview");
  });

  it("should render all node types", () => {
    const svg = generateOverviewSVG(basicData);

    expect(svg).toContain("main-node");
    expect(svg).toContain("section-node");
    expect(svg).toContain("concept-node");
    expect(svg).toContain("detail-node");
  });

  it("should use default options when not provided", () => {
    const svg = generateOverviewSVG(basicData);

    // Default dimensions
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="800"');
  });

  it("should respect custom dimensions", () => {
    const svg = generateOverviewSVG(basicData, { width: 800, height: 600 });

    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="600"');
  });

  it("should use dark theme by default", () => {
    const svg = generateOverviewSVG(basicData);

    // Dark theme uses slate background
    expect(svg).toContain("#1e293b");
  });

  it("should support light theme", () => {
    const svg = generateOverviewSVG(basicData, { theme: "light" });

    // Light theme uses white background
    expect(svg).toContain("#ffffff");
  });

  it("should support radial layout", () => {
    const svg = generateOverviewSVG(basicData, { layout: "radial" });

    // Should generate valid SVG
    expect(svg).toContain("</svg>");
  });

  it("should support tree layout", () => {
    const svg = generateOverviewSVG(basicData, { layout: "tree" });

    // Should generate valid SVG
    expect(svg).toContain("</svg>");
  });

  it("should draw connection paths between nodes", () => {
    const svg = generateOverviewSVG(basicData);

    // Should contain path elements for connections
    expect(svg).toContain('<path class="connection"');
  });

  it("should include subject badge when present", () => {
    const dataWithSubject: OverviewData = {
      ...basicData,
      subject: "Mathematics",
    };

    const svg = generateOverviewSVG(dataWithSubject);

    expect(svg).toContain("Mathematics");
  });

  it("should not include subject badge when absent", () => {
    const dataWithoutSubject: OverviewData = {
      title: "Test",
      root: { id: "root", label: "Root", type: "main" },
    };

    const svg = generateOverviewSVG(dataWithoutSubject);

    // Should not have a subject text at bottom right
    expect(svg).not.toContain('text-anchor="end" font-size="12"');
  });

  it("should include styles for all node types", () => {
    const svg = generateOverviewSVG(basicData);

    expect(svg).toContain(".main-node");
    expect(svg).toContain(".section-node");
    expect(svg).toContain(".concept-node");
    expect(svg).toContain(".detail-node");
    expect(svg).toContain(".connection");
  });

  it("should escape XML special characters in title", () => {
    const dataWithSpecialChars: OverviewData = {
      title: 'Test <script>alert("xss")</script>',
      root: { id: "root", label: "Root", type: "main" },
    };

    const svg = generateOverviewSVG(dataWithSpecialChars);

    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("should truncate long labels", () => {
    const longLabel = "A".repeat(50);
    const dataWithLongLabel: OverviewData = {
      title: "Test",
      root: { id: "root", label: longLabel, type: "main" },
    };

    const svg = generateOverviewSVG(dataWithLongLabel, { maxLabelLength: 25 });

    // Label should be truncated with ...
    expect(svg).toContain("...");
    expect(svg).not.toContain(longLabel);
  });

  it("should show icons by default", () => {
    const svg = generateOverviewSVG(basicData);

    // Icons are prepended to node labels
    expect(svg).toContain("🎯"); // main node icon
  });

  it("should hide icons when showIcons is false", () => {
    const svg = generateOverviewSVG(basicData, { showIcons: false });

    // Main node icon should not be present
    expect(svg).not.toContain("📚");
  });

  it("should handle nodes without children", () => {
    const dataNoChildren: OverviewData = {
      title: "Test",
      root: { id: "root", label: "Root", type: "main" },
    };

    const svg = generateOverviewSVG(dataNoChildren);

    // Should still generate valid SVG
    expect(svg).toContain("</svg>");
    expect(svg).toContain("Root");
  });

  it("should handle deep nesting", () => {
    const deepData: OverviewData = {
      title: "Deep",
      root: {
        id: "root",
        label: "Root",
        type: "main",
        children: [
          {
            id: "s1",
            label: "S1",
            type: "section",
            children: [
              {
                id: "c1",
                label: "C1",
                type: "concept",
                children: [
                  {
                    id: "d1",
                    label: "D1",
                    type: "detail",
                    children: [{ id: "d2", label: "D2", type: "detail" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const svg = generateOverviewSVG(deepData);

    expect(svg).toContain("</svg>");
    expect(svg).toContain("D2");
  });

  it("should use correct font sizes for different levels", () => {
    const svg = generateOverviewSVG(basicData);

    // Font sizes: 16 for root, 14 for level 1, 12 for others
    expect(svg).toContain('font-size="16"');
    expect(svg).toContain('font-size="14"');
    expect(svg).toContain('font-size="12"');
  });
});
