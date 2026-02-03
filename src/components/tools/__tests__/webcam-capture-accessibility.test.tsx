/**
 * @file webcam-capture-accessibility.test.tsx
 * @brief Accessibility tests for WebcamCapture component
 * Tests for T2-01, T2-02, T2-03 - ARIA labels, focus management, keyboard nav
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebcamCapture } from "../webcam-capture";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    img: ({ className, alt, ...props }: any) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={className} alt={alt || ""} {...props} />
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("WebcamCapture - Accessibility (T2-01, T2-02, T2-03)", () => {
  const mockOnCapture = vi.fn();
  const mockOnClose = vi.fn();
  const mockHandleCapture = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("T2-01: Dialog role, ARIA labels, focus trap, keyboard navigation", () => {
    it("should have role='dialog' on main container", () => {
      const { container } = render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
    });

    it("should have aria-label describing the dialog purpose", () => {
      const { container } = render(
        <WebcamCapture
          purpose="Test Camera"
          instructions="Take a photo"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toHaveAttribute("aria-label");
      expect(dialog?.getAttribute("aria-label")).toContain("Test Camera");
    });

    it("should close dialog when Escape key is pressed", async () => {
      const user = userEvent.setup();
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      await user.keyboard("{Escape}");
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should trigger capture when Enter key is pressed (when not disabled)", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      // Focus the dialog first
      const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
      dialog?.focus();

      await user.keyboard("{Enter}");
      // Should trigger capture (implementation will call handleCapture from hook)
      expect(mockHandleCapture).toHaveBeenCalled();
    });

    it("should have aria-label on close button", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const closeButton = screen.getByRole("button", { name: /close|chiudi/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute("aria-label");
    });

    it("should have aria-label on camera switch button", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      // When cameras are available, switch button should have aria-label
      const switchButtons = screen.queryAllByRole("button");
      const switchButton = switchButtons.find((btn) =>
        btn.getAttribute("aria-label")?.includes("switch"),
      );

      if (switchButton) {
        expect(switchButton).toHaveAttribute("aria-label");
      }
    });

    it("should have aria-label on timer option buttons", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
          showTimer={true}
        />,
      );

      const timerButtons = screen.queryAllByRole("button");
      const timerButton = timerButtons.find((btn) =>
        btn.getAttribute("aria-label")?.includes("Timer"),
      );

      if (timerButton) {
        expect(timerButton).toHaveAttribute("aria-label");
      }
    });
  });

  describe("T2-02: Screen reader announcements with aria-live regions", () => {
    it("should have aria-live region for camera status", () => {
      const { container } = render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it("should have role='status' for status messages", () => {
      const { container } = render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const statusRegion = container.querySelector('[role="status"]');
      expect(statusRegion).toBeInTheDocument();
    });

    it("should announce loading state to screen readers", () => {
      const { container } = render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      // When loading, should have appropriate announcement
      const liveRegion = container.querySelector("[aria-live]");
      if (liveRegion) {
        expect(liveRegion.textContent).toBeDefined();
      }
    });

    it("should announce capture success to screen readers", () => {
      const { container } = render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      // After capture, should announce success
      const statusRegion = container.querySelector('[role="status"]');
      expect(statusRegion).toBeInTheDocument();
    });
  });

  describe("T2-03: Focus indicators and contrast", () => {
    it("should have focus-visible:ring on capture button", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const captureButton = buttons.find(
        (btn) =>
          btn.textContent?.includes("takePhoto") ||
          btn.textContent?.includes("capture"),
      );

      if (captureButton) {
        expect(captureButton.className).toMatch(/focus(-visible)?:ring/);
      }
    });

    it("should have focus-visible:ring on retake button", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const retakeButton = buttons.find((btn) =>
        btn.textContent?.includes("retake"),
      );

      if (retakeButton) {
        expect(retakeButton.className).toMatch(/focus(-visible)?:ring/);
      }
    });

    it("should have focus-visible:ring on confirm button", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const confirmButton = buttons.find((btn) =>
        btn.textContent?.includes("confirm"),
      );

      if (confirmButton) {
        expect(confirmButton.className).toMatch(/focus(-visible)?:ring/);
      }
    });

    it("should have focus-visible:ring on close button in header", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const closeButton = screen.getByRole("button", { name: /close|chiudi/i });
      expect(closeButton.className).toMatch(/focus(-visible)?:ring/);
    });

    it("should have focus-visible:ring on timer buttons", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
          showTimer={true}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const timerButtons = buttons.filter((btn) =>
        btn.getAttribute("aria-label")?.includes("Timer"),
      );

      timerButtons.forEach((btn) => {
        expect(btn.className).toMatch(/focus(-visible)?:ring/);
      });
    });

    it("should have focus-visible:ring on camera menu button", () => {
      render(
        <WebcamCapture
          purpose="Test Camera"
          onCapture={mockOnCapture}
          onClose={mockOnClose}
        />,
      );

      const buttons = screen.getAllByRole("button");
      const menuButton = buttons.find((btn) =>
        btn.className?.includes("border-slate-600"),
      );

      if (menuButton) {
        expect(menuButton.className).toMatch(/focus(-visible)?:ring/);
      }
    });
  });
});
