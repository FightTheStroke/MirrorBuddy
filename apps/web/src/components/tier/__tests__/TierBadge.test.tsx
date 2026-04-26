/**
 * MIRRORBUDDY - TierBadge Component Tests
 *
 * Tests for tier-level indicator badge component.
 * Verifies rendering of tier badges with appropriate styling.
 *
 * i18n-agnostic: Tier names (Pro, Base, Trial) are tier code identifiers
 * from mock data, not user-facing translated strings.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierBadge } from "../TierBadge";
import type { TierName } from "@/types/tier-types";

describe("TierBadge", () => {
  describe("rendering", () => {
    it("renders badge with correct tier label", () => {
      render(<TierBadge tier="pro" />);
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it('renders "Base" tier label', () => {
      render(<TierBadge tier="base" />);
      expect(screen.getByText("Base")).toBeInTheDocument();
    });

    it('renders "Trial" tier label', () => {
      render(<TierBadge tier="trial" />);
      expect(screen.getByText("Trial")).toBeInTheDocument();
    });

    it("renders badge element with role=img for accessibility", () => {
      const { container } = render(<TierBadge tier="pro" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies pro tier styles", () => {
      const { container } = render(<TierBadge tier="pro" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass("bg-purple-600", "text-white", "font-semibold");
    });

    it("applies base tier styles", () => {
      const { container } = render(<TierBadge tier="base" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass("bg-blue-600", "text-white", "text-xs");
    });

    it("applies trial tier styles", () => {
      const { container } = render(<TierBadge tier="trial" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass("bg-slate-300", "text-slate-700", "text-xs");
    });

    it("pro tier badge is prominent (larger/bolder)", () => {
      const { container: proBadge } = render(<TierBadge tier="pro" />);
      const { container: baseBadge } = render(<TierBadge tier="base" />);

      const proElement = proBadge.querySelector('[role="img"]');
      const baseElement = baseBadge.querySelector('[role="img"]');

      const proClasses = proElement?.className || "";
      const baseClasses = baseElement?.className || "";

      // Pro should have semibold, base should not
      expect(proClasses).toContain("font-semibold");
      expect(baseClasses).not.toContain("font-semibold");
    });
  });

  describe("size", () => {
    it("renders with compact padding", () => {
      const { container } = render(<TierBadge tier="pro" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass("px-2", "py-1");
    });

    it("has rounded corners", () => {
      const { container } = render(<TierBadge tier="pro" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass("rounded-full");
    });
  });

  describe("optional icon", () => {
    it("renders with crown icon for pro tier when showIcon is true", () => {
      render(<TierBadge tier="pro" showIcon />);
      // Check if icon SVG exists
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("does not render icon when showIcon is false or undefined", () => {
      const { container } = render(<TierBadge tier="pro" showIcon={false} />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe("size variants", () => {
    it("applies sm size by default", () => {
      const { container } = render(<TierBadge tier="pro" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass("px-2", "py-1");
    });

    it("applies md size when specified", () => {
      const { container } = render(<TierBadge tier="pro" size="md" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass("px-3", "py-1.5");
    });

    it("renders sm size for base tier", () => {
      const { container } = render(<TierBadge tier="base" size="sm" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass("px-2", "py-1");
    });
  });

  describe("accessibility", () => {
    it("has aria-label describing tier level", () => {
      const { container } = render(<TierBadge tier="pro" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveAttribute("aria-label");
      expect(badge?.getAttribute("aria-label")).toContain("Pro");
    });

    it("aria-label contains tier name", () => {
      const { container } = render(<TierBadge tier="base" />);
      const badge = container.querySelector('[role="img"]');
      expect(badge?.getAttribute("aria-label")).toContain("Base");
    });
  });

  describe("variants", () => {
    const tiers: TierName[] = ["trial", "base", "pro"];

    tiers.forEach((tier) => {
      it(`renders ${tier} tier without errors`, () => {
        const { container } = render(<TierBadge tier={tier} />);
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });
});
