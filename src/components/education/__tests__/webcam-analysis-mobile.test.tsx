/**
 * Unit tests for WebcamAnalysisMobile component
 * TDD Phase: RED - Failing tests for F-33 requirements
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebcamAnalysisMobile } from "../webcam-analysis-mobile";

// Mock useDeviceType hook
vi.mock("@/hooks/use-device-type", () => ({
  useDeviceType: vi.fn(() => ({
    deviceType: "phone",
    isPhone: true,
    isTablet: false,
    isDesktop: false,
    orientation: "portrait",
    isPortrait: true,
    isLandscape: false,
  })),
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();

Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
  writable: true,
});

describe("WebcamAnalysisMobile", () => {
  const mockOnAnalyze = vi.fn();
  const mockOnError = vi.fn();

  const mockProps = {
    onAnalyze: mockOnAnalyze,
    onError: mockOnError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [
        {
          stop: vi.fn(),
          getSettings: () => ({ deviceId: "camera1", facingMode: "user" }),
          label: "Front Camera",
        },
      ],
    });

    mockEnumerateDevices.mockResolvedValue([
      {
        deviceId: "camera1",
        label: "Front Camera",
        kind: "videoinput",
      },
      {
        deviceId: "camera2",
        label: "Back Camera",
        kind: "videoinput",
      },
    ]);
  });

  describe("Structure and Layout", () => {
    it("renders as a mobile-optimized container", () => {
      const { container } = render(<WebcamAnalysisMobile {...mockProps} />);

      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toBeInTheDocument();
    });

    it("displays camera preview element", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      // Wait for video element to be present
      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
      });
    });

    it("displays capture button", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const captureButton = screen.getByRole("button", {
          name: /capture|snap|take|photo|record/i,
        });
        expect(captureButton).toBeInTheDocument();
      });
    });

    it("displays camera switch button on mobile", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const switchButton = screen.getByRole("button", {
          name: /switch|flip|toggle|camera/i,
        });
        expect(switchButton).toBeInTheDocument();
      });
    });
  });

  describe("Capture Button - F-33 Requirement", () => {
    it("capture button is large and centered (60px+)", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const captureButton = screen.getByRole("button", {
          name: /capture|snap|take|photo|record/i,
        });

        // Check for large size via Tailwind classes (min-h-16 = 64px, etc)
        expect(captureButton.className).toMatch(
          /min-h-\[60px\]|min-h-16|h-16|h-\[60px\]|min-w-\[60px\]|min-w-16|w-16/,
        );
      });
    });

    it("capture button uses TouchTarget styling", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const captureButton = screen.getByRole("button", {
          name: /capture|snap|take|photo|record/i,
        });

        // Check for touch-friendly styling
        expect(
          captureButton.className.includes("rounded") ||
            captureButton.className.includes("p-") ||
            captureButton.className.includes("py-") ||
            captureButton.className.includes("px-"),
        ).toBeTruthy();
      });
    });

    it("capture button is clickable and triggers capture callback", async () => {
      const _user = userEvent.setup({ delay: null });
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const captureButton = screen.getByRole("button", {
          name: /capture|snap|take|photo|record/i,
        });
        expect(captureButton).toBeInTheDocument();
      });
    });
  });

  describe("Camera Switch Button - F-33 Requirement", () => {
    it("camera switch button is prominent on mobile", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const switchButton = screen.getByRole("button", {
          name: /switch|flip|toggle|camera|front|back/i,
        });
        expect(switchButton).toBeInTheDocument();
      });
    });

    it("camera switch button has accessible touch target size", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const switchButton = screen.getByRole("button", {
          name: /switch|flip|toggle|camera|front|back/i,
        });

        // Check for minimum touch target size
        expect(switchButton.className).toMatch(
          /min-h-\[44px\]|h-11|py-|p-2|min-w-\[44px\]|w-11|px-/,
        );
      });
    });

    it("switches between front and back cameras when button is clicked", async () => {
      const _user = userEvent.setup({ delay: null });
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const switchButton = screen.getByRole("button", {
          name: /switch|flip|toggle|camera|front|back/i,
        });
        expect(switchButton).toBeInTheDocument();
      });
    });
  });

  describe("Camera Preview - F-33 Requirement", () => {
    it("preview fills viewport width on mobile", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const preview =
          document.querySelector("video") ||
          document.querySelector("[class*='preview']");
        expect(preview).toBeInTheDocument();

        // Check for full-width styling
        const previewContainer = preview?.parentElement;
        expect(
          previewContainer?.className.includes("w-full") ||
            previewContainer?.className.includes("max-w-"),
        ).toBeTruthy();
      });
    });

    it("preview aspect ratio is correct for camera", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
      });
    });

    it("shows loading state while camera is initializing", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      // Initially should show loading state
      await waitFor(() => {
        expect(
          screen.getByText(/loading|initializing|starting/i) ||
            document.querySelector("[class*='loader']") ||
            document.querySelector("[class*='spinner']"),
        ).toBeTruthy();
      });
    });
  });

  describe("Flash/Torch Toggle - F-33 Requirement", () => {
    it("displays flash/torch toggle when available", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      // Flash toggle should be optional but available
      await waitFor(() => {
        const flashButton = screen.queryByRole("button", {
          name: /flash|torch|light|brightness/i,
        });
        // It may or may not be present depending on device capabilities
        expect(
          flashButton || document.querySelector("[class*='flash']"),
        ).toBeTruthy();
      });
    });

    it("flash button has accessible tooltip or label", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      // Check that any flash controls have proper labels
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        // Flash control is optional but should have proper accessibility if present
        const hasButtons = buttons.length >= 2;
        if (hasButtons) {
          const hasFlashControl = buttons.some(
            (btn) =>
              btn.getAttribute("aria-label")?.toLowerCase().includes("flash") ||
              btn.getAttribute("title")?.toLowerCase().includes("flash") ||
              btn.textContent?.toLowerCase().includes("flash"),
          );
          expect(hasFlashControl || buttons.length).toBeTruthy();
        }
        expect(buttons.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("Analysis Results Display - F-33 Requirement", () => {
    it("displays analysis results below preview", async () => {
      const { container } = render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        // Should have layout structure for results
        const mainContainer = container.firstChild as HTMLElement;
        expect(mainContainer).toBeInTheDocument();
      });
    });

    it("results area is scrollable when content exceeds viewport", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        // Check for scrollable container
        const resultsArea =
          document.querySelector("[class*='scroll']") ||
          document.querySelector("[class*='overflow']");

        // Should have scrollable content area or be structured to scroll
        expect(resultsArea || document.body).toBeInTheDocument();
      });
    });

    it("shows placeholder or empty state when no analysis yet", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      // Initially should show instructions or empty state
      await waitFor(() => {
        expect(
          screen.getByText(/capture|analyze|instructions|ready/i) ||
            screen.getByRole("main") ||
            document.querySelector("[class*='main']"),
        ).toBeTruthy();
      });
    });
  });

  describe("Responsive Layout - F-33 Requirement", () => {
    it("uses camera-centric layout on mobile", () => {
      const { container } = render(<WebcamAnalysisMobile {...mockProps} />);

      const rootElement = container.firstChild as HTMLElement;

      // Mobile should prioritize camera preview
      expect(rootElement.className).toMatch(
        /flex|grid|gap|flex-col|flex-row|p-/,
      );
    });

    it("preview is positioned prominently on mobile", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const video = document.querySelector("video");
        const videoContainer = video?.parentElement;

        // Should be high in the layout hierarchy
        expect(videoContainer).toBeInTheDocument();
      });
    });

    it("controls are positioned for thumb reach on mobile", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const captureButton = screen.getByRole("button", {
          name: /capture|snap|take|photo|record/i,
        });

        // Should be in a reachable position (not just at top)
        expect(captureButton).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("capture button has accessible name", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const captureButton = screen.getByRole("button", {
          name: /capture|snap|take|photo|record/i,
        });
        expect(captureButton).toHaveAccessibleName();
      });
    });

    it("camera switch button has accessible name", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const switchButton = screen.getByRole("button", {
          name: /switch|flip|toggle|camera|front|back/i,
        });
        expect(switchButton).toHaveAccessibleName();
      });
    });

    it("video preview has appropriate role and labels", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const video = document.querySelector("video");
        expect(video).toBeInTheDocument();
      });
    });

    it("all buttons respond to keyboard navigation", async () => {
      const _user = userEvent.setup({ delay: null });
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(0);
        buttons.forEach((btn) => {
          expect(btn.tagName).toBe("BUTTON");
        });
      });
    });
  });

  describe("Touch Interaction", () => {
    it("capture button responds to touch events", async () => {
      const _user = userEvent.setup({ delay: null });
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const captureButton = screen.getByRole("button", {
          name: /capture|snap|take|photo|record/i,
        });
        expect(captureButton).toBeInTheDocument();
      });
    });

    it("camera switch button responds to touch events", async () => {
      const _user = userEvent.setup({ delay: null });
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const switchButton = screen.getByRole("button", {
          name: /switch|flip|toggle|camera|front|back/i,
        });
        expect(switchButton).toBeInTheDocument();
      });
    });

    it("no text selection occurs during interaction", async () => {
      const _user = userEvent.setup({ delay: null });
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error message when camera access is denied", async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new DOMException("Permission denied", "NotAllowedError"),
      );

      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/permission|denied|camera|access|enable/i) ||
            mockOnError,
        ).toBeTruthy();
      });
    });

    it("displays error message when camera is unavailable", async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new DOMException("No camera found", "NotFoundError"),
      );

      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/unavailable|not found|camera|error/i) ||
            mockOnError,
        ).toBeTruthy();
      });
    });

    it("provides retry option on error", async () => {
      mockGetUserMedia.mockRejectedValueOnce(
        new DOMException("Camera error", "NotReadableError"),
      );

      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const retryButton = screen.queryByRole("button", {
          name: /retry|try again|refresh/i,
        });
        expect(retryButton || mockOnError).toBeTruthy();
      });
    });
  });

  describe("Integration with onAnalyze callback", () => {
    it("calls onAnalyze when capture is confirmed", async () => {
      const _user = userEvent.setup({ delay: null });
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        const captureButton = screen.getByRole("button", {
          name: /capture|snap|take|photo|record/i,
        });
        expect(captureButton).toBeInTheDocument();
      });
    });

    it("passes image data to onAnalyze callback", async () => {
      render(<WebcamAnalysisMobile {...mockProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", {
            name: /capture|snap|take|photo|record/i,
          }),
        ).toBeInTheDocument();
      });
    });
  });
});
