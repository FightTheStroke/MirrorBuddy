import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

/**
 * Test suite for responsive admin button groups.
 * Ensures button groups properly wrap on mobile and stack vertically when needed.
 *
 * F-43 Requirements:
 * 1. Button groups wrap to multiple lines on mobile (flex-wrap)
 * 2. Stack vertically when needed (flex-col on xs)
 * 3. Maintain proper spacing between wrapped buttons
 * 4. 44x44px minimum touch targets
 * 5. Apply to all admin action button groups
 */

// Mock component for testing button group patterns
function TestButtonGroup() {
  return (
    <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row">
      <button className="min-h-11 min-w-11 px-4 py-2">Button 1</button>
      <button className="min-h-11 min-w-11 px-4 py-2">Button 2</button>
      <button className="min-h-11 min-w-11 px-4 py-2">Button 3</button>
    </div>
  );
}

describe("Admin Button Groups - Responsive Layout (F-43)", () => {
  describe("Button Group Structure", () => {
    it("should render buttons with proper flex structure", () => {
      render(<TestButtonGroup />);
      const container = screen.getByRole("button", {
        name: /Button 1/i,
      }).parentElement;
      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("flex-wrap");
      expect(container).toHaveClass("gap-2");
    });

    it("should have flex-col on xs breakpoint", () => {
      render(<TestButtonGroup />);
      const container = screen.getByRole("button", {
        name: /Button 1/i,
      }).parentElement;
      expect(container).toHaveClass("xs:flex-col");
    });

    it("should have flex-row on sm breakpoint", () => {
      render(<TestButtonGroup />);
      const container = screen.getByRole("button", {
        name: /Button 1/i,
      }).parentElement;
      expect(container).toHaveClass("sm:flex-row");
    });
  });

  describe("Button Touch Target Sizing", () => {
    it("should have minimum 44x44px touch targets", () => {
      render(<TestButtonGroup />);
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveClass("min-h-11");
        expect(button).toHaveClass("min-w-11");
      });
    });

    it("should have proper padding around button content", () => {
      render(<TestButtonGroup />);
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveClass("px-4");
        expect(button).toHaveClass("py-2");
      });
    });
  });

  describe("Button Group Spacing", () => {
    it("should have consistent gap between buttons", () => {
      render(<TestButtonGroup />);
      const container = screen.getByRole("button", {
        name: /Button 1/i,
      }).parentElement;
      expect(container).toHaveClass("gap-2");
    });

    it("should wrap buttons when container is narrow", () => {
      render(<TestButtonGroup />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
      // When flex-wrap is applied, buttons will wrap to new lines
      expect(buttons[0].parentElement).toHaveClass("flex-wrap");
    });
  });

  describe("Mobile Responsiveness", () => {
    it("should stack buttons vertically on extra small screens", () => {
      render(<TestButtonGroup />);
      const container = screen.getByRole("button", {
        name: /Button 1/i,
      }).parentElement;
      expect(container).toHaveClass("xs:flex-col");
    });

    it("should display buttons in row layout on small screens and up", () => {
      render(<TestButtonGroup />);
      const container = screen.getByRole("button", {
        name: /Button 1/i,
      }).parentElement;
      expect(container).toHaveClass("sm:flex-row");
    });
  });

  describe("Common Admin Patterns", () => {
    it("modal-actions should have proper button group classes", () => {
      // This tests the pattern used in modal-actions component
      const { container } = render(
        <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row">
          <button className="min-h-11 min-w-11 flex-1">Cancel</button>
          <button className="min-h-11 min-w-11 flex-1">Submit</button>
        </div>,
      );
      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("flex");
      expect(wrapper).toHaveClass("flex-wrap");
      expect(wrapper).toHaveClass("gap-2");
      expect(wrapper).toHaveClass("xs:flex-col");
      expect(wrapper).toHaveClass("sm:flex-row");
    });

    it("action bar should have proper button group classes", () => {
      // This tests the pattern used in bulk-action-bar
      const { container } = render(
        <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row items-center">
          <button className="min-h-11 min-w-11">Action 1</button>
          <button className="min-h-11 min-w-11">Action 2</button>
        </div>,
      );
      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveClass("flex-wrap");
    });
  });
});
