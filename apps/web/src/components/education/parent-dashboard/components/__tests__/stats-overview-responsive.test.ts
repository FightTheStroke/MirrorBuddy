/**
 * Unit Tests: StatsOverview Component Responsive Behavior
 * F-50: Parent dashboard charts responsive sizing
 *
 * Tests that the stats overview component uses responsive grid classes
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("StatsOverview - Responsive Grid (F-50)", () => {
  it("should use responsive grid classes for stats cards", () => {
    const filePath = join(__dirname, "../stats-overview.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for responsive grid classes
    expect(content).toContain("grid-cols-1");
    expect(content).toContain("sm:grid-cols-2");
    expect(content).toContain("lg:grid-cols-3");

    // Should NOT have hardcoded grid-cols-3 without responsive prefix
    const lines = content.split("\n");
    const gridLine = lines.find(
      (line) => line.includes("className=") && line.includes("grid"),
    );
    expect(gridLine).toContain("grid-cols-1");
  });

  it("should have proper gap spacing between cards", () => {
    const filePath = join(__dirname, "../stats-overview.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for gap spacing
    expect(content).toContain("gap-4");
  });

  it("should have minimum readable text sizes", () => {
    const filePath = join(__dirname, "../stats-overview.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for readable font sizes
    expect(content).toContain("text-3xl"); // Large stat numbers
    expect(content).toContain("text-sm"); // Labels
  });

  it("should include padding for card readability on mobile", () => {
    const filePath = join(__dirname, "../stats-overview.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for padding
    expect(content).toMatch(/p[tybxy]?-[0-9]/);
  });

  it("should have properly sized icons for mobile display", () => {
    const filePath = join(__dirname, "../stats-overview.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for icon sizing (w-8 h-8 for 32px)
    expect(content).toContain("w-8 h-8");
  });
});
