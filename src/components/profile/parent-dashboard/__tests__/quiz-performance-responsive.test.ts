/**
 * Unit Tests: Quiz Performance Component Responsive Behavior
 * F-50: Parent dashboard charts responsive sizing
 *
 * Tests that the quiz performance component uses responsive grid classes
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("QuizPerformance - Responsive Grid (F-50)", () => {
  it("should use responsive grid classes for quiz stats", () => {
    const filePath = join(__dirname, "../quiz-performance.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for responsive grid classes
    expect(content).toContain("grid-cols-1");
    expect(content).toContain("sm:grid-cols-2");
    expect(content).toContain("lg:grid-cols-3");

    // Should NOT have hardcoded grid-cols-3
    const hasHardcodedThreeColumns =
      content.match(/className="[^"]*grid[^"]*grid-cols-3[^"]*"/) &&
      !content.includes("lg:grid-cols-3");
    expect(hasHardcodedThreeColumns).toBeFalsy();
  });

  it("should have proper gap spacing for responsive layout", () => {
    const filePath = join(__dirname, "../quiz-performance.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for gap spacing
    expect(content).toContain("gap-3");
  });

  it("should have readable padding for data points", () => {
    const filePath = join(__dirname, "../quiz-performance.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for adequate padding (p-3 or greater)
    expect(content).toMatch(/p-[3-6]/);
  });

  it("should use readable text sizes for mobile", () => {
    const filePath = join(__dirname, "../quiz-performance.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for readable font sizes
    expect(content).toContain("text-2xl"); // Data values
    expect(content).toContain("text-xs"); // Labels
  });

  it("should have ARIA labels for accessibility", () => {
    const filePath = join(__dirname, "../quiz-performance.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Check for ARIA label for the entire section
    expect(content).toContain("aria-label");
  });
});
