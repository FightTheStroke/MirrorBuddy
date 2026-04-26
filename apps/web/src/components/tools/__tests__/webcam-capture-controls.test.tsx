/**
 * Unit tests for WebcamControls component
 * Tests for viewport visibility and button states
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WebcamControls } from "../webcam-capture/components/webcam-controls";
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

describe("WebcamControls - Viewport Visibility", () => {
  describe("Capture button rendering", () => {
    it("capture button renders and is visible", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      // Assert
      expect(captureButton).toBeInTheDocument();
      expect(captureButton).toBeVisible();
    });

    it("capture button has minimum height for visibility", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      // Assert - h-16 = 64px, min-h-[64px] ensures visibility
      expect(
        captureButton.className.includes("h-16") ||
          captureButton.className.includes("min-h-[64px]"),
      ).toBe(true);
    });
  });

  describe("Button disabled states", () => {
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

    it("capture button is enabled when not loading and no error", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} />);
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.getByRole("button", { name: takePhotoText });

      // Assert
      expect(captureButton).not.toBeDisabled();
    });
  });

  describe("After capture - retake and confirm buttons", () => {
    it("shows retake button after capture", () => {
      // Arrange & Act
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );
      const retakeText = getTranslation("tools.webcam.retake");
      const retakeButton = screen.getByRole("button", { name: retakeText });

      // Assert
      expect(retakeButton).toBeInTheDocument();
      expect(retakeButton).toBeVisible();
    });

    it("shows confirm button after capture", () => {
      // Arrange & Act
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );
      const confirmText = getTranslation("tools.webcam.confirm");
      const confirmButton = screen.getByRole("button", { name: confirmText });

      // Assert
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toBeVisible();
    });

    it("hides capture button after image is captured", () => {
      // Arrange & Act
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );
      const takePhotoText = getTranslation("tools.webcam.takePhoto");
      const captureButton = screen.queryByRole("button", {
        name: takePhotoText,
      });

      // Assert
      expect(captureButton).not.toBeInTheDocument();
    });

    it("retake button has adequate height for touch targets", () => {
      // Arrange & Act
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );
      const retakeText = getTranslation("tools.webcam.retake");
      const retakeButton = screen.getByRole("button", { name: retakeText });

      // Assert - h-16 = 64px meets WCAG touch target size
      expect(retakeButton.className).toContain("h-16");
    });

    it("confirm button has adequate height for touch targets", () => {
      // Arrange & Act
      render(
        <WebcamControls
          {...defaultProps}
          capturedImage="data:image/png;base64,test"
        />,
      );
      const confirmText = getTranslation("tools.webcam.confirm");
      const confirmButton = screen.getByRole("button", { name: confirmText });

      // Assert - h-16 = 64px meets WCAG touch target size
      expect(confirmButton.className).toContain("h-16");
    });
  });

  describe("Timer options rendering", () => {
    it("timer options render when showTimer is true", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} showTimer={true} />);

      // Assert - timer buttons should be present
      const buttons = screen.getAllByRole("button");
      const timerButtons = buttons.filter((btn) =>
        btn.getAttribute("aria-label")?.includes("Timer"),
      );

      expect(timerButtons.length).toBeGreaterThan(0);
    });

    it("timer options do not render when showTimer is false", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} showTimer={false} />);

      // Assert - no timer buttons should be present
      const buttons = screen.getAllByRole("button");
      const timerButtons = buttons.filter((btn) =>
        btn.getAttribute("aria-label")?.includes("Timer"),
      );

      expect(timerButtons.length).toBe(0);
    });

    it("timer buttons have adequate size for touch targets", () => {
      // Arrange & Act
      render(<WebcamControls {...defaultProps} showTimer={true} />);

      // Assert
      const buttons = screen.getAllByRole("button");
      const timerButtons = buttons.filter((btn) =>
        btn.getAttribute("aria-label")?.includes("Timer"),
      );

      timerButtons.forEach((btn) => {
        // w-16 h-16 = 64x64px meets WCAG touch target size
        expect(
          btn.className.includes("w-16") && btn.className.includes("h-16"),
        ).toBe(true);
      });
    });
  });
});
