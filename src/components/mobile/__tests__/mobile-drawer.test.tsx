/**
 * Unit tests for MobileDrawer component
 * Ensures accessible mobile drawer with keyboard and focus management
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileDrawer } from "../mobile-drawer";

describe("MobileDrawer", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    // Reset body overflow
    document.body.style.overflow = "";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <MobileDrawer isOpen={false} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders drawer and backdrop when open", () => {
    render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div data-testid="drawer-content">Drawer Content</div>
      </MobileDrawer>,
    );

    expect(screen.getByTestId("drawer-content")).toBeInTheDocument();
    // Backdrop should be rendered
    const backdrop = document.querySelector(".bg-black\\/50");
    expect(backdrop).toBeTruthy();
  });

  it("renders children content", () => {
    render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Test Content</div>
        <button>Test Button</button>
      </MobileDrawer>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /test button/i }),
    ).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("closes when backdrop is clicked", () => {
    const { container } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    const backdrop = container.querySelector(".bg-black\\/50") as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("closes when close button is clicked", () => {
    render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    // Find the close button (X icon)
    const closeButton = screen.getAllByRole("button")[0]; // First button is the close button
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("prevents body scroll when open", () => {
    const { rerender } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    // Close drawer
    rerender(
      <MobileDrawer isOpen={false} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    expect(document.body.style.overflow).toBe("");
  });

  it("applies custom className to drawer", () => {
    const { container } = render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        className="custom-drawer-class"
      >
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    // Find the drawer element (not the backdrop)
    const drawer = container.querySelector(".custom-drawer-class");
    expect(drawer).toBeTruthy();
  });

  it("has correct z-index for overlay", () => {
    const { container } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    // Check the main container has z-50
    const mainContainer = container.querySelector(".z-50");
    expect(mainContainer).toBeTruthy();
  });

  it("drawer slides in from left", () => {
    const { container } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    // Check for slide-in animation class
    const drawer = container.querySelector(".slide-in-from-left");
    expect(drawer).toBeTruthy();
  });

  it("drawer has max width constraint", () => {
    const { container } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    // Check for max-w class
    const drawer = container.querySelector("[class*='max-w']");
    expect(drawer).toBeTruthy();
  });

  it("only shows on mobile breakpoint", () => {
    const { container } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    // Check for sm:hidden class (hidden on sm and up)
    const mainContainer = container.querySelector(".sm\\:hidden");
    expect(mainContainer).toBeTruthy();
  });

  it("includes safe area insets for mobile devices", () => {
    const { container } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    // Check for safe area inset classes
    // This checks if safe area insets are in the className
    const drawerElement = container.querySelector(".absolute.top-0.left-0");
    expect(drawerElement?.className).toMatch(
      /pt-\[env\(safe-area-inset-top\)\]/,
    );
  });

  it("does not close when clicking inside drawer content", () => {
    render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div data-testid="drawer-content">Drawer Content</div>
      </MobileDrawer>,
    );

    const content = screen.getByTestId("drawer-content");
    fireEvent.click(content);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("cleans up event listeners on unmount", () => {
    const { unmount } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    unmount();

    // After unmount, Escape should not call onClose
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("restores body scroll on unmount", () => {
    const { unmount } = render(
      <MobileDrawer isOpen={true} onClose={mockOnClose}>
        <div>Drawer Content</div>
      </MobileDrawer>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("");
  });
});
