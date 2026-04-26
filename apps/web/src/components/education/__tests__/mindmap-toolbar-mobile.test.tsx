/**
 * MindmapToolbarMobile component tests - F-27: Mobile-friendly toolbar with 44px touch targets
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

vi.mock("@/hooks/use-safe-area", () => ({
  useSafeArea: vi.fn(() => ({
    top: 0,
    bottom: 34,
    left: 0,
    right: 0,
  })),
}));

// Import after mocks are set up
import { MindmapToolbarMobile } from "../mindmap-toolbar-mobile";
import { useDeviceType } from "@/hooks/use-device-type";

describe("MindmapToolbarMobile", () => {
  const mockOnZoomIn = vi.fn();
  const mockOnZoomOut = vi.fn();
  const mockOnFitToScreen = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders toolbar with all action buttons", () => {
    render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fit to screen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/export/i)).toBeInTheDocument();
  });

  it("renders pinch-to-zoom hint for mobile users", () => {
    render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    expect(screen.getByText(/pinch to zoom/i)).toBeInTheDocument();
  });

  it("displays toolbar at bottom with safe area padding", () => {
    const { container } = render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    const toolbar = container.querySelector("[data-testid='mindmap-toolbar']");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveClass("fixed", "bottom-0");
  });

  it("has touch targets with minimum 44px size", () => {
    const { container } = render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => {
      // Check that buttons have the h-11 class (44px height)
      expect(button.className).toContain("h-11");
      expect(button.className).toContain("w-11");
    });
  });

  it("calls onZoomIn when zoom in button clicked", async () => {
    const user = userEvent.setup();
    render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    await user.click(screen.getByLabelText(/zoom in/i));
    expect(mockOnZoomIn).toHaveBeenCalled();
  });

  it("calls onZoomOut when zoom out button clicked", async () => {
    const user = userEvent.setup();
    render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    await user.click(screen.getByLabelText(/zoom out/i));
    expect(mockOnZoomOut).toHaveBeenCalled();
  });

  it("calls onFitToScreen when fit to screen button clicked", async () => {
    const user = userEvent.setup();
    render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    await user.click(screen.getByLabelText(/fit to screen/i));
    expect(mockOnFitToScreen).toHaveBeenCalled();
  });

  it("calls onExport when export button clicked", async () => {
    const user = userEvent.setup();
    render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    await user.click(screen.getByLabelText(/export/i));
    expect(mockOnExport).toHaveBeenCalled();
  });

  it("hides toolbar on desktop devices", () => {
    vi.mocked(useDeviceType).mockReturnValueOnce({
      deviceType: "desktop",
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    const { container } = render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    const toolbar = container.querySelector("[data-testid='mindmap-toolbar']");
    expect(toolbar).toBeNull();
  });

  it("shows toolbar on tablet devices", () => {
    vi.mocked(useDeviceType).mockReturnValueOnce({
      deviceType: "tablet",
      isPhone: false,
      isTablet: true,
      isDesktop: false,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    const { container } = render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    const toolbar = container.querySelector("[data-testid='mindmap-toolbar']");
    expect(toolbar).toBeInTheDocument();
  });

  it("applies responsive layout classes", () => {
    const { container } = render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    const toolbar = container.querySelector("[data-testid='mindmap-toolbar']");
    expect(toolbar).toHaveClass(
      "flex",
      "items-center",
      "justify-center",
      "gap-2",
    );
  });

  it("uses flexbox layout for horizontal button arrangement", () => {
    const { container } = render(
      <MindmapToolbarMobile
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onFitToScreen={mockOnFitToScreen}
        onExport={mockOnExport}
      />,
    );

    const toolbar = container.querySelector("[data-testid='mindmap-toolbar']");
    expect(toolbar).toHaveClass("flex");
    expect(toolbar).toHaveClass("items-center");
    expect(toolbar).toHaveClass("justify-center");
  });
});
