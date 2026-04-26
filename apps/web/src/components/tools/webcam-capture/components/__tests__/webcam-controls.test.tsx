/**
 * Unit tests for WebcamControls component
 * F-01: Large capture button (min 60px)
 * F-02: Visible retry and confirm buttons
 * F-03: Good touch targets (min 44px)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WebcamControls } from "../webcam-controls";
import { getTranslation } from "@/test/i18n-helpers";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const fullKey = `tools.webcam.${key}`;
    return getTranslation(fullKey);
  },
}));

const defaultProps = {
  showTimer: false,
  selectedTimer: 0 as const,
  onTimerChange: vi.fn(),
  countdown: null,
  capturedImage: null,
  isLoading: false,
  error: null,
  onCapture: vi.fn(),
  onRetake: vi.fn(),
  onConfirm: vi.fn(),
};

describe("WebcamControls - Button Sizes", () => {
  describe("Basic rendering", () => {
    it("capture button renders and is visible", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      // Assert
      expect(captureButton).toBeInTheDocument();
      expect(captureButton).toBeVisible();
    });
  });

  describe("Button states", () => {
    it("capture button is disabled when loading", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} isLoading={true} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", {
        name: takePhotoText,
      });

      // Assert
      expect(captureButton).toBeDisabled();
    });

    it("capture button is disabled when there's an error", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} error="Camera error" />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      // Assert
      expect(captureButton).toBeDisabled();
    });

    it("capture button is disabled when countdown is active", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} countdown={3} />);
      const inProgressText = getTranslation("tools.webcam.inProgress");
      const captureButton = screen.getByRole("button", {
        name: inProgressText,
      });

      // Assert
      expect(captureButton).toBeDisabled();
    });
  });

  describe("F-01: Large capture button (minimum 60px)", () => {
    it("capture button has h-16 class (64px)", () => {
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      expect(captureButton.className).toContain("h-16");
    });

    it("capture button has min-h-[64px] class", () => {
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      expect(captureButton.className).toContain("min-h-[64px]");
    });

    it("capture button meets 60px minimum height requirement", () => {
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      // h-16 = 64px which is >= 60px
      expect(
        captureButton.className.includes("h-16") ||
          captureButton.className.includes("min-h-[64px]"),
      ).toBe(true);
    });
  });

  describe("F-02: Retry and confirm buttons visibility", () => {
    it("retry button is visible when image captured", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const retakeText = getTranslation("tools.webcam.retake");
      const retryButton = screen.getByRole("button", { name: retakeText });
      expect(retryButton).toBeVisible();
    });

    it("confirm button is visible when image captured", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const confirmText = getTranslation("tools.webcam.confirm");
      const confirmButton = screen.getByRole("button", { name: confirmText });
      expect(confirmButton).toBeVisible();
    });

    it("retry button has h-16 for adequate touch targets", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const retakeText = getTranslation("tools.webcam.retake");
      const retryButton = screen.getByRole("button", { name: retakeText });

      expect(retryButton.className).toContain("h-16");
    });

    it("confirm button has h-16 for adequate touch targets", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const confirmText = getTranslation("tools.webcam.confirm");
      const confirmButton = screen.getByRole("button", { name: confirmText });

      expect(confirmButton.className).toContain("h-16");
    });

    it("retry button has min-h-[64px]", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const retakeText = getTranslation("tools.webcam.retake");
      const retryButton = screen.getByRole("button", { name: retakeText });

      expect(retryButton.className).toContain("min-h-[64px]");
    });

    it("confirm button has min-h-[64px]", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const confirmText = getTranslation("tools.webcam.confirm");
      const confirmButton = screen.getByRole("button", { name: confirmText });

      expect(confirmButton.className).toContain("min-h-[64px]");
    });
  });

  describe("F-03: Touch targets (minimum 44px)", () => {
    it("capture button meets WCAG 44px minimum", () => {
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      // h-16 = 64px which is > 44px WCAG minimum
      expect(captureButton.className).toContain("h-16");
    });

    it("retry button meets WCAG 44px minimum", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const retakeText = getTranslation("tools.webcam.retake");
      const retryButton = screen.getByRole("button", { name: retakeText });

      // h-16 = 64px which is > 44px WCAG minimum
      expect(retryButton.className).toContain("h-16");
    });

    it("confirm button meets WCAG 44px minimum", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const confirmText = getTranslation("tools.webcam.confirm");
      const confirmButton = screen.getByRole("button", { name: confirmText });

      // h-16 = 64px which is > 44px WCAG minimum
      expect(confirmButton.className).toContain("h-16");
    });
  });

  describe("F-04: Consistent dark theme styling", () => {
    it("capture button has blue theme color", () => {
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      expect(captureButton.className).toContain("blue");
    });

    it("confirm button has green theme color", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const confirmText = getTranslation("tools.webcam.confirm");
      const confirmButton = screen.getByRole("button", { name: confirmText });

      expect(confirmButton.className).toContain("green");
    });

    it("retry button has appropriate dark theme colors", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const retakeText = getTranslation("tools.webcam.retake");
      const retryButton = screen.getByRole("button", { name: retakeText });

      // Should have slate border colors for dark theme
      expect(
        retryButton.className.includes("slate") ||
          retryButton.className.includes("border"),
      ).toBe(true);
    });

    it("confirm button has shadow for visual hierarchy", () => {
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );

      const confirmText = getTranslation("tools.webcam.confirm");
      const confirmButton = screen.getByRole("button", { name: confirmText });

      expect(confirmButton.className).toContain("shadow");
    });
  });

  describe("Timer selection", () => {
    it("renders timer buttons when showTimer is true", () => {
      render(<WebcamControls {...defaultProps} showTimer={true} />);

      // Timer buttons should be present (w-16 h-16)
      const buttons = screen.getAllByRole("button");
      const timerButtons = buttons.filter((btn) =>
        btn.getAttribute("aria-label")?.includes("Timer"),
      );

      expect(timerButtons.length).toBeGreaterThan(0);
    });

    it("timer buttons have w-16 h-16 for 64px size", () => {
      render(<WebcamControls {...defaultProps} showTimer={true} />);

      const buttons = screen.getAllByRole("button");
      const timerButtons = buttons.filter((btn) =>
        btn.getAttribute("aria-label")?.includes("Timer"),
      );

      timerButtons.forEach((btn) => {
        expect(
          btn.className.includes("w-16") && btn.className.includes("h-16"),
        ).toBe(true);
      });
    });
  });
});
