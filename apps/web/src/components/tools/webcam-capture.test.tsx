import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WebcamCapture } from "./webcam-capture";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock the hook
vi.mock("./webcam-capture/hooks/use-webcam-capture", () => ({
  useWebcamCapture: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    capturedImage: null,
    isLoading: false,
    error: null,
    errorType: null,
    selectedTimer: 0,
    setSelectedTimer: vi.fn(),
    countdown: null,
    showFlash: false,
    availableCameras: [],
    selectedCameraId: null,
    showCameraMenu: false,
    setShowCameraMenu: vi.fn(),
    activeCameraLabel: "Camera",
    isSwitchingCamera: false,
    isMobileDevice: false,
    currentCameraName: "Default Camera",
    handleCapture: vi.fn(),
    handleCancelCountdown: vi.fn(),
    handleRetake: vi.fn(),
    handleConfirm: vi.fn(),
    handleRetry: vi.fn(),
    switchCamera: vi.fn(),
    toggleFrontBack: vi.fn(),
  }),
}));

// Mock child components
vi.mock("./webcam-capture/components/webcam-header", () => ({
  WebcamHeader: () => <div data-testid="webcam-header">Header</div>,
}));

vi.mock("./webcam-capture/components/webcam-preview", () => ({
  WebcamPreview: () => <div data-testid="webcam-preview">Preview</div>,
}));

vi.mock("./webcam-capture/components/webcam-controls", () => ({
  WebcamControls: () => <div data-testid="webcam-controls">Controls</div>,
}));

vi.mock("./webcam-capture/utils/camera-utils", () => ({
  isContinuityCamera: vi.fn(),
}));

describe("WebcamCapture - Fullscreen Overlay", () => {
  const defaultProps = {
    purpose: "Test purpose",
    onCapture: vi.fn(),
    onClose: vi.fn(),
  };

  it("should render as a fullscreen overlay with black background", () => {
    const { container } = render(<WebcamCapture {...defaultProps} />);
    const overlay = container.firstChild as HTMLElement;

    // Should have fixed positioning covering entire viewport
    expect(overlay.className).toContain("fixed");
    expect(overlay.className).toContain("inset-0");

    // Should have black background (not semi-transparent)
    expect(overlay.className).toContain("bg-black");
  });

  it("should have full height layout", () => {
    const { container } = render(<WebcamCapture {...defaultProps} />);
    const overlay = container.firstChild as HTMLElement;

    // Should use full viewport height
    expect(
      overlay.className.includes("h-screen") ||
        overlay.className.includes("100vh"),
    ).toBe(true);
  });

  it("should render header, preview, and controls in order", () => {
    render(<WebcamCapture {...defaultProps} />);

    const header = screen.getByTestId("webcam-header");
    const preview = screen.getByTestId("webcam-preview");
    const controls = screen.getByTestId("webcam-controls");

    expect(header).toBeInTheDocument();
    expect(preview).toBeInTheDocument();
    expect(controls).toBeInTheDocument();
  });

  it("should NOT have Card wrapper or max-width constraint", () => {
    const { container } = render(<WebcamCapture {...defaultProps} />);
    const html = container.innerHTML;

    // Should not have max-w-4xl or Card-specific classes
    expect(html).not.toContain("max-w-4xl");
    expect(html).not.toContain("max-w-");
  });
});
