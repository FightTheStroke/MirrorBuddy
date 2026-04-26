/**
 * Unit tests for MobileVoiceOverlay component
 * Ensures accessible mobile overlay with motion preferences
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileVoiceOverlay } from "../mobile-voice-overlay";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

describe("MobileVoiceOverlay", () => {
  const mockOnClose = vi.fn();
  const mockChildren = <div data-testid="overlay-content">Voice Panel</div>;

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it("renders nothing when not visible", () => {
    render(
      <MobileVoiceOverlay isVisible={false} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    expect(screen.queryByTestId("overlay-content")).not.toBeInTheDocument();
  });

  it("renders overlay when visible", () => {
    render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    expect(screen.getByTestId("overlay-content")).toBeInTheDocument();
  });

  it("renders backdrop with correct opacity", () => {
    const { container } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    // Check for backdrop with bg-black/30
    const backdrop = container.querySelector(".bg-black\\/30");
    expect(backdrop).toBeTruthy();
  });

  it("closes when backdrop is clicked", () => {
    const { container } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    const backdrop = container.querySelector(".bg-black\\/30") as HTMLElement;
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("closes when close button is clicked", () => {
    render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key", () => {
    render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("has max height of 50vh", () => {
    const { container } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    // Check for max-h-[50vh]
    const overlay = container.querySelector("[class*='max-h']");
    expect(overlay?.className).toMatch(/max-h-\[50vh\]/);
  });

  it("has rounded top corners", () => {
    const { container } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    // Check for rounded-t
    const overlay = container.querySelector("[class*='rounded-t']");
    expect(overlay).toBeTruthy();
  });

  it("is fixed at bottom", () => {
    const { container } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    // Check for fixed positioning at bottom
    const overlay = container.querySelector(".fixed.bottom-0");
    expect(overlay).toBeTruthy();
  });

  it("only renders on mobile (< lg breakpoint)", () => {
    const { container } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    // Should have lg:hidden class
    const mainContainer = container.querySelector(".lg\\:hidden");
    expect(mainContainer).toBeTruthy();
  });

  it("does not close when clicking overlay content", () => {
    render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    const content = screen.getByTestId("overlay-content");
    fireEvent.click(content);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("has proper z-index for overlay", () => {
    const { container } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    // Check for z-50 or similar high z-index
    const mainContainer = container.querySelector(".z-50");
    expect(mainContainer).toBeTruthy();
  });

  it("prevents body scroll when visible", () => {
    const { rerender } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <MobileVoiceOverlay isVisible={false} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    expect(document.body.style.overflow).toBe("");
  });

  it("has aria-modal attribute", () => {
    const { container } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    const modal = container.querySelector("[aria-modal='true']");
    expect(modal).toBeTruthy();
  });

  it("has dialog role", () => {
    render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it("cleans up on unmount", () => {
    const { unmount } = render(
      <MobileVoiceOverlay isVisible={true} onClose={mockOnClose}>
        {mockChildren}
      </MobileVoiceOverlay>,
    );

    unmount();

    // After unmount, Escape should not call onClose
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).not.toHaveBeenCalled();

    // Body scroll should be restored
    expect(document.body.style.overflow).toBe("");
  });
});
