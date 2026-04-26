/* eslint-disable security/detect-non-literal-regexp -- test file uses getTranslation() helper which escapes all regex chars */
/**
 * MIRRORBUDDY - Trial Limits Banner Tests
 *
 * Tests for the UI component displaying trial tier limits from TierService.
 * Verifies all limits match the TierService configuration:
 * - 10 daily chats
 * - 5 minutes daily voice
 * - 10 daily tools
 * - 3 maestri available
 *
 * NOTE: Tests verify structure and values, not specific translated strings.
 * This allows i18n text to change without breaking tests.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrialLimitsBanner } from "../trial-limits-banner";
import { getTranslation } from "@/test/i18n-helpers";

describe("TrialLimitsBanner", () => {
  describe("full variant (default)", () => {
    it("renders all four limit categories", () => {
      const { container } = render(<TrialLimitsBanner />);

      // Check header exists with translation
      const titleText = getTranslation("auth.trialLimits.title");
      expect(screen.getByText(titleText)).toBeInTheDocument();

      // Check we have 4 limit items (grid children)
      const limitItems = container.querySelectorAll(".grid > div");
      expect(limitItems.length).toBeGreaterThanOrEqual(4);
    });

    it("displays correct daily chat limit (10)", () => {
      const { container } = render(<TrialLimitsBanner />);
      const numbers = container.querySelectorAll(".text-lg.font-semibold");

      // First number should be 10 (daily chats)
      expect(numbers[0]).toHaveTextContent("10");
    });

    it("displays correct daily voice limit (5 minutes)", () => {
      const { container } = render(<TrialLimitsBanner />);
      const numbers = container.querySelectorAll(".text-lg.font-semibold");

      // Second number should be 5 (daily voice minutes)
      expect(numbers[1]).toHaveTextContent("5");
    });

    it("displays correct daily tools limit (10)", () => {
      const { container } = render(<TrialLimitsBanner />);
      const numbers = container.querySelectorAll(".text-lg.font-semibold");

      // Third number should be 10 (daily tools)
      expect(numbers[2]).toHaveTextContent("10");
    });

    it("displays correct maestri limit (3)", () => {
      const { container } = render(<TrialLimitsBanner />);
      const numbers = container.querySelectorAll(".text-lg.font-semibold");

      // Fourth number should be 3 (maestri count)
      expect(numbers[3]).toHaveTextContent("3");
    });

    it("displays trial information text", () => {
      render(<TrialLimitsBanner />);

      // Check CTA text exists (partial match via translation)
      const ctaText = getTranslation("auth.trialLimits.trialDescription");
      expect(
        screen.getByText(
          new RegExp(
            ctaText.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          ),
        ),
      ).toBeInTheDocument();
    });

    it("has correct styling classes", () => {
      const { container } = render(<TrialLimitsBanner />);
      const banner = container.querySelector(".rounded-xl");

      expect(banner).toHaveClass("border", "p-4");
      expect(banner?.className).toContain("from-purple-50");
    });

    it("applies custom className", () => {
      const { container } = render(
        <TrialLimitsBanner className="custom-class" />,
      );
      const banner = container.querySelector(".rounded-xl");

      expect(banner?.className).toContain("custom-class");
    });
  });

  describe("compact variant", () => {
    it("renders compact layout with core limits", () => {
      const { container } = render(<TrialLimitsBanner variant="compact" />);

      // Check limits values are shown (numbers, not specific text)
      const text = container.textContent || "";
      expect(text).toContain("10");
      expect(text).toContain("5");
      expect(text).toContain("3");
    });

    it("uses inline-flex layout", () => {
      const { container } = render(<TrialLimitsBanner variant="compact" />);
      const banner = container.querySelector(".inline-flex");

      expect(banner).toBeInTheDocument();
    });

    it("shows bullet point separators", () => {
      const { container } = render(<TrialLimitsBanner variant="compact" />);
      const text = container.textContent || "";

      // Should have bullet characters separating items
      expect(text).toContain("•");
    });

    it("applies custom className in compact variant", () => {
      const { container } = render(
        <TrialLimitsBanner variant="compact" className="custom-compact" />,
      );
      const banner = container.querySelector(".inline-flex");

      expect(banner?.className).toContain("custom-compact");
    });
  });

  describe("TierService alignment", () => {
    it("shows limits matching TierService Trial tier configuration", () => {
      // Trial tier limits from src/lib/tier/tier-fallbacks.ts:
      // - chatLimitDaily: 10
      // - voiceMinutesDaily: 5
      // - toolsLimitDaily: 10
      // - maestriLimit: 3

      const { container } = render(<TrialLimitsBanner />);
      const numbers = container.querySelectorAll(".text-lg.font-semibold");

      expect(numbers[0]).toHaveTextContent("10"); // chats
      expect(numbers[1]).toHaveTextContent("5"); // voice minutes
      expect(numbers[2]).toHaveTextContent("10"); // tools
      expect(numbers[3]).toHaveTextContent("3"); // maestri
    });

    it("does not show hardcoded placeholders or mismatched values", () => {
      const { container } = render(<TrialLimitsBanner />);
      const text = container.textContent || "";

      // Should NOT contain common placeholder values
      expect(text).not.toContain("XX");
      expect(text).not.toContain("unlimited");
      expect(text).not.toContain("999");
    });
  });

  describe("accessibility", () => {
    it("renders with semantic structure", () => {
      render(<TrialLimitsBanner />);

      // Check for title element (p tag for accessibility)
      const titleText = getTranslation("auth.trialLimits.title");
      const title = screen.getByText(titleText);
      expect(title.tagName).toBe("P");
    });

    it("provides icons for visual context", () => {
      const { container } = render(<TrialLimitsBanner />);

      // Should have SVG icons (Lucide icons)
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("responsive design", () => {
    it("uses grid layout responsive to screen size", () => {
      const { container } = render(<TrialLimitsBanner />);
      const grid = container.querySelector(".grid");

      expect(grid?.className).toContain("grid-cols-2");
      expect(grid?.className).toContain("md:grid-cols-4");
    });
  });
});
