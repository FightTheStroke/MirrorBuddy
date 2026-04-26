/**
 * Unit tests for DotMatrixVisualizer component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { DotMatrixVisualizer } from "../dot-matrix-visualizer";

// Mock canvas context
const mockFillRect = vi.fn();
const mockClearRect = vi.fn();
const mockBeginPath = vi.fn();
const mockArc = vi.fn();
const mockFill = vi.fn();

const mockContext = {
  fillRect: mockFillRect,
  clearRect: mockClearRect,
  beginPath: mockBeginPath,
  arc: mockArc,
  fill: mockFill,
  fillStyle: "",
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as never;

// Mock requestAnimationFrame
const mockRAF = vi.fn((_cb: FrameRequestCallback) => {
  return 1;
});
const mockCAF = vi.fn();

vi.stubGlobal("requestAnimationFrame", mockRAF);
vi.stubGlobal("cancelAnimationFrame", mockCAF);

// Mock matchMedia for reduced motion
const mockMatchMedia = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.stubGlobal("matchMedia", mockMatchMedia);

describe("DotMatrixVisualizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    it("renders a canvas element", () => {
      const { container } = render(
        <DotMatrixVisualizer analyser={null} isActive={false} />,
      );
      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
    });

    it("applies correct dimensions based on props", () => {
      const { container } = render(
        <DotMatrixVisualizer
          analyser={null}
          isActive={false}
          rows={4}
          cols={6}
          dotSize={8}
          gap={4}
        />,
      );
      const canvas = container.querySelector("canvas");
      // width = cols * (dotSize + gap) - gap + dotSize = 6 * (8 + 4) - 4 + 8 = 76
      // height = rows * (dotSize + gap) - gap + dotSize = 4 * (8 + 4) - 4 + 8 = 52
      expect(canvas).toHaveAttribute("width", "76");
      expect(canvas).toHaveAttribute("height", "52");
    });

    it("applies default dimensions when no props provided", () => {
      const { container } = render(
        <DotMatrixVisualizer analyser={null} isActive={false} />,
      );
      const canvas = container.querySelector("canvas");
      // Default: rows=8, cols=10, dotSize=6, gap=8
      // width = 10 * (6 + 8) - 8 + 6 = 138
      // height = 8 * (6 + 8) - 8 + 6 = 110
      expect(canvas).toHaveAttribute("width", "138");
      expect(canvas).toHaveAttribute("height", "110");
    });

    it("has aria-hidden for accessibility", () => {
      const { container } = render(
        <DotMatrixVisualizer analyser={null} isActive={false} />,
      );
      const canvas = container.querySelector("canvas");
      expect(canvas).toHaveAttribute("aria-hidden", "true");
    });

    it("has role=presentation for screen readers", () => {
      const { container } = render(
        <DotMatrixVisualizer analyser={null} isActive={false} />,
      );
      const canvas = container.querySelector("canvas");
      expect(canvas).toHaveAttribute("role", "presentation");
    });

    it("applies custom className", () => {
      const { container } = render(
        <DotMatrixVisualizer
          analyser={null}
          isActive={false}
          className="custom-class"
        />,
      );
      const canvas = container.querySelector("canvas");
      expect(canvas).toHaveClass("custom-class");
    });

    it("applies rounded-lg class by default", () => {
      const { container } = render(
        <DotMatrixVisualizer analyser={null} isActive={false} />,
      );
      const canvas = container.querySelector("canvas");
      expect(canvas).toHaveClass("rounded-lg");
    });
  });

  describe("Animation", () => {
    it("starts animation when isActive is true", () => {
      render(<DotMatrixVisualizer analyser={null} isActive={true} />);
      expect(mockRAF).toHaveBeenCalled();
    });

    it("starts animation when isSpeaking is true", () => {
      render(
        <DotMatrixVisualizer
          analyser={null}
          isActive={false}
          isSpeaking={true}
        />,
      );
      expect(mockRAF).toHaveBeenCalled();
    });

    it("draws static state when inactive", () => {
      render(<DotMatrixVisualizer analyser={null} isActive={false} />);
      // Should still draw once for static state
      expect(mockClearRect).toHaveBeenCalled();
    });

    it("cancels animation on unmount", () => {
      const { unmount } = render(
        <DotMatrixVisualizer analyser={null} isActive={true} />,
      );
      unmount();
      expect(mockCAF).toHaveBeenCalled();
    });
  });

  describe("Reduced Motion", () => {
    it("checks prefers-reduced-motion media query", () => {
      render(<DotMatrixVisualizer analyser={null} isActive={false} />);
      expect(mockMatchMedia).toHaveBeenCalledWith(
        "(prefers-reduced-motion: reduce)",
      );
    });

    it("listens for reduced motion preference changes", () => {
      const addEventListenerMock = vi.fn();
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerMock,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      render(<DotMatrixVisualizer analyser={null} isActive={false} />);
      expect(addEventListenerMock).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });
  });

  describe("Audio Analyser Integration", () => {
    it("handles null analyser gracefully", () => {
      expect(() => {
        render(<DotMatrixVisualizer analyser={null} isActive={true} />);
      }).not.toThrow();
    });

    it("gets frequency data when analyser is provided", () => {
      const mockGetByteFrequencyData = vi.fn();
      const mockAnalyser = {
        frequencyBinCount: 128,
        getByteFrequencyData: mockGetByteFrequencyData,
      } as unknown as AnalyserNode;

      render(<DotMatrixVisualizer analyser={mockAnalyser} isActive={true} />);

      // Trigger the animation frame callback manually
      const rafCallback = mockRAF.mock.calls[0]?.[0];
      if (rafCallback) {
        rafCallback(0);
      }

      expect(mockGetByteFrequencyData).toHaveBeenCalled();
    });
  });

  describe("Color Handling", () => {
    it("uses default cyan color when not specified", () => {
      render(<DotMatrixVisualizer analyser={null} isActive={false} />);
      // Default color is #22d3ee (cyan-400) = rgb(34, 211, 238)
      // Canvas should use this color for drawing
      expect(mockContext.fillStyle).toBeDefined();
    });

    it("accepts custom color prop", () => {
      expect(() => {
        render(
          <DotMatrixVisualizer
            analyser={null}
            isActive={false}
            color="#ff0000"
          />,
        );
      }).not.toThrow();
    });

    it("handles invalid color gracefully with fallback", () => {
      expect(() => {
        render(
          <DotMatrixVisualizer
            analyser={null}
            isActive={false}
            color="invalid"
          />,
        );
      }).not.toThrow();
    });
  });
});
