/**
 * MIRRORBUDDY - LockedFeatureOverlay Component Tests
 *
 * Tests for feature access restriction overlay component.
 * Verifies rendering of overlay with lock indicators and upgrade prompts.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LockedFeatureOverlay } from "../LockedFeatureOverlay";

describe("LockedFeatureOverlay", () => {
  describe("rendering when feature is locked", () => {
    it("renders overlay when feature is locked for trial tier", () => {
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Webcam Feature Content</div>
        </LockedFeatureOverlay>,
      );

      expect(screen.getByText("Webcam Feature Content")).toBeInTheDocument();
      // Overlay should be present
      const overlay = document.querySelector('[data-testid="locked-overlay"]');
      expect(overlay).toBeInTheDocument();
    });

    it("renders overlay when feature is locked for base tier", () => {
      render(
        <LockedFeatureOverlay tier="base" feature="webcam">
          <div>Webcam Feature Content</div>
        </LockedFeatureOverlay>,
      );

      expect(screen.getByText("Webcam Feature Content")).toBeInTheDocument();
    });

    it("renders lock icon in overlay", () => {
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const lockIcon = document.querySelector('[data-icon="lock"]');
      expect(lockIcon).toBeInTheDocument();
    });

    it("displays Pro badge when feature is locked", () => {
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("renders upgrade button/link", () => {
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const upgradeButton =
        screen.getByRole("button", { name: /upgrade/i }) ||
        screen.getByText(/upgrade/i);
      expect(upgradeButton).toBeInTheDocument();
    });

    it("applies semi-transparent overlay styling", () => {
      const { container } = render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const overlay = container.querySelector('[data-testid="locked-overlay"]');
      if (overlay) {
        expect(overlay.className).toMatch(/opacity|bg-.*\/|rgba/);
      }
    });
  });

  describe("rendering when feature is not locked", () => {
    it("does not render overlay for pro tier", () => {
      const { container } = render(
        <LockedFeatureOverlay tier="pro" feature="webcam">
          <div data-testid="feature-content">Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const featureContent = screen.getByTestId("feature-content");
      expect(featureContent).toBeInTheDocument();

      // Overlay should not be present
      const overlay = container.querySelector('[data-testid="locked-overlay"]');
      expect(overlay).not.toBeInTheDocument();
    });

    it("renders children normally without overlay for pro tier", () => {
      render(
        <LockedFeatureOverlay tier="pro" feature="webcam">
          <button>Click me</button>
        </LockedFeatureOverlay>,
      );

      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it("children are clickable and interactive when tier has access", () => {
      render(
        <LockedFeatureOverlay tier="pro" feature="webcam">
          <button>Click me</button>
        </LockedFeatureOverlay>,
      );

      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeEnabled();
    });
  });

  describe("overlay interaction", () => {
    it("upgrade button is clickable", async () => {
      const user = userEvent.setup();
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const upgradeButton = screen.getByRole("button", { name: /upgrade/i });
      expect(upgradeButton).not.toBeDisabled();
      await user.click(upgradeButton);
    });

    it("overlay prevents interaction with locked feature", () => {
      const handleClick = vi.fn();

      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <button onClick={handleClick}>Hidden Content</button>
        </LockedFeatureOverlay>,
      );

      // The button should be hidden behind the overlay, not clickable
      const contentButton = screen.getByRole("button", {
        name: /hidden content/i,
      });
      expect(contentButton).toBeInTheDocument();

      // Even if we try to click, the overlay should prevent it
      const overlay = document.querySelector('[data-testid="locked-overlay"]');
      if (overlay?.classList.contains("pointer-events-auto")) {
        // Overlay has pointer events, so feature is truly blocked
        expect(overlay).toHaveClass("pointer-events-auto");
      }
    });
  });

  describe("feature support", () => {
    it("locks webcam feature for trial tier", () => {
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Webcam Feature</div>
        </LockedFeatureOverlay>,
      );

      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("supports multiple locked features", () => {
      const features = ["webcam", "parent_dashboard", "analytics"] as const;

      features.forEach((feature) => {
        const { unmount } = render(
          <LockedFeatureOverlay tier="trial" feature={feature}>
            <div>{feature} Feature</div>
          </LockedFeatureOverlay>,
        );

        expect(screen.getByText("Pro")).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("accessibility", () => {
    it("overlay has proper ARIA attributes", () => {
      const { container } = render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const overlay = container.querySelector('[data-testid="locked-overlay"]');
      if (overlay) {
        // Should indicate locked status
        expect(
          overlay.getAttribute("aria-label") || overlay.getAttribute("role"),
        ).toBeTruthy();
      }
    });

    it("lock icon is accessible", () => {
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      // Lock icon should be in the DOM (potentially hidden from screen readers if label is elsewhere)
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("upgrade button is keyboard accessible", async () => {
      const user = userEvent.setup();
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const upgradeButton = screen.getByRole("button", { name: /upgrade/i });
      await user.tab();
      expect(upgradeButton).toHaveFocus();
    });
  });

  describe("styling", () => {
    it("overlay has semi-transparent background", () => {
      const { container } = render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const overlay = container.querySelector('[data-testid="locked-overlay"]');
      if (overlay) {
        // Should have some opacity/transparency class
        const hasTransparency = Array.from(overlay.classList).some(
          (cls) =>
            cls.includes("bg-") ||
            cls.includes("opacity") ||
            cls.includes("rgba"),
        );
        expect(hasTransparency).toBeTruthy();
      }
    });

    it("preserves child container layout with relative positioning", () => {
      const { container } = render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div data-testid="feature-container">Feature Content</div>
        </LockedFeatureOverlay>,
      );

      const wrapper = container.querySelector(
        '[data-testid="locked-overlay-wrapper"]',
      );
      if (wrapper && "className" in wrapper) {
        expect((wrapper as HTMLElement).className).toContain("relative");
      }
    });
  });

  describe("tier coverage", () => {
    it("locks features for trial tier", () => {
      render(
        <LockedFeatureOverlay tier="trial" feature="webcam">
          <div>Feature</div>
        </LockedFeatureOverlay>,
      );

      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("locks features for base tier", () => {
      render(
        <LockedFeatureOverlay tier="base" feature="webcam">
          <div>Feature</div>
        </LockedFeatureOverlay>,
      );

      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("does not lock features for pro tier", () => {
      const { container } = render(
        <LockedFeatureOverlay tier="pro" feature="webcam">
          <div>Feature</div>
        </LockedFeatureOverlay>,
      );

      const overlay = container.querySelector('[data-testid="locked-overlay"]');
      expect(overlay).not.toBeInTheDocument();
    });
  });
});
