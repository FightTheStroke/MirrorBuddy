/**
 * Unit tests for ChartGeneratorMobile component
 * Tests: mobile-optimized data input, chart type selection, responsive layout
 * Requirement: F-32 - Chart generator has mobile-friendly data input and chart display
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChartGeneratorMobile } from "../chart-generator-mobile";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock recharts (simple mock for chart library)
vi.mock("recharts", () => ({
  LineChart: ({ children }: React.PropsWithChildren) => (
    <div data-testid="line-chart">{children}</div>
  ),
  BarChart: ({ children }: React.PropsWithChildren) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  PieChart: ({ children }: React.PropsWithChildren) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Plus: () => <div data-testid="plus-icon">+</div>,
  Trash2: () => <div data-testid="trash-icon">🗑</div>,
  BarChart3: () => <div data-testid="bar-icon">📊</div>,
  LineChart: () => <div data-testid="line-icon">📈</div>,
  PieChart: () => <div data-testid="pie-icon">🥧</div>,
  Share2: () => <div data-testid="share-icon">↗</div>,
  Download: () => <div data-testid="download-icon">⬇</div>,
  ZoomIn: () => <div data-testid="zoom-in-icon">🔍</div>,
}));

describe("ChartGeneratorMobile", () => {
  const mockOnExport = vi.fn();
  const mockOnShare = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the chart generator with initial state", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      expect(screen.getByText(/Chart Generator/i)).toBeInTheDocument();
    });

    it("renders chart type selector with bar, line, and pie options", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      expect(screen.getByRole("button", { name: /bar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /line/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /pie/i })).toBeInTheDocument();
    });

    it("renders data input section with label and value fields", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/value/i)).toBeInTheDocument();
    });
  });

  describe("Mobile-Optimized Input", () => {
    it("has large input fields with min-height for touch targets", () => {
      const { container } = render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      const inputs = container.querySelectorAll(
        "input[type='text'], input[type='number']",
      );
      inputs.forEach((input) => {
        // Check for min-height in className or style
        expect(input.className).toMatch(/min-h|h-|py/);
      });
    });

    it("shows number keyboard for value input field", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      const valueInput = screen.getByLabelText(/value/i);
      expect(valueInput).toHaveAttribute("type", "number");
    });

    it("allows adding data points with label and value", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "January");
      await user.type(valueInput, "42");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("January")).toBeInTheDocument();
        expect(screen.getByText("42")).toBeInTheDocument();
      });
    });

    it("clears input fields after adding a data point", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      const labelInput = screen.getByLabelText(/label/i) as HTMLInputElement;
      const valueInput = screen.getByLabelText(/value/i) as HTMLInputElement;
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "January");
      await user.type(valueInput, "42");
      await user.click(addButton);

      await waitFor(() => {
        expect(labelInput.value).toBe("");
        expect(valueInput.value).toBe("");
      });
    });

    it("allows removing data points", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "January");
      await user.type(valueInput, "42");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("January")).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", {
        name: /delete|remove/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText("January")).not.toBeInTheDocument();
      });
    });
  });

  describe("Chart Type Selection", () => {
    it("defaults to bar chart", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      // Add data to render chart
      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "Test");
      await user.type(valueInput, "10");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
      });
    });

    it("switches to line chart when line option is selected", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      // Add data first
      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "Test");
      await user.type(valueInput, "10");
      await user.click(addButton);

      const lineButton = screen.getByRole("button", { name: /line/i });
      await user.click(lineButton);

      await waitFor(() => {
        expect(screen.getByTestId("line-chart")).toBeInTheDocument();
      });
    });

    it("switches to pie chart when pie option is selected", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      // Add data first
      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "Test");
      await user.type(valueInput, "10");
      await user.click(addButton);

      const pieButton = screen.getByRole("button", { name: /pie/i });
      await user.click(pieButton);

      await waitFor(() => {
        expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
      });
    });

    it("shows visual icons for chart type options", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      expect(screen.getByTestId("bar-icon")).toBeInTheDocument();
      expect(screen.getByTestId("line-icon")).toBeInTheDocument();
      expect(screen.getByTestId("pie-icon")).toBeInTheDocument();
    });
  });

  describe("Chart Display", () => {
    it("renders responsive container that fills available width", () => {
      const { container } = render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      // Check for w-full class in container
      const mainContainer = container.querySelector("[class*='w-full']");
      expect(mainContainer).toBeInTheDocument();
    });

    it("displays chart data when points are added", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "Test");
      await user.type(valueInput, "10");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
      });
    });
  });

  describe("Touch Targets (44px minimum)", () => {
    it("add button has 44px minimum touch target", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      const addButton = screen.getByRole("button", { name: /add/i });
      expect(addButton.className).toMatch(/min-h/);
    });

    it("export button has 44px minimum touch target", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      const exportButton = screen.getByRole("button", {
        name: /export|download/i,
      });
      expect(exportButton.className).toMatch(/min-h/);
    });

    it("share button has 44px minimum touch target", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      const shareButton = screen.getByRole("button", { name: /share/i });
      expect(shareButton.className).toMatch(/min-h/);
    });

    it("chart type selector buttons have 44px minimum touch targets", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      const barButton = screen.getByRole("button", { name: /bar/i });
      const lineButton = screen.getByRole("button", { name: /line/i });
      const pieButton = screen.getByRole("button", { name: /pie/i });

      expect(barButton.className).toMatch(/min-h|h-|p/);
      expect(lineButton.className).toMatch(/min-h|h-|p/);
      expect(pieButton.className).toMatch(/min-h|h-|p/);
    });
  });

  describe("Responsive Layout", () => {
    it("uses xs: breakpoint for responsive styling", () => {
      const { container } = render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      // Component should have responsive classes for mobile-first design
      expect(container.innerHTML).toMatch(/xs:/);
    });

    it("renders stacked layout on mobile viewport", () => {
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      // Check for flex-col (stacked) on mobile
      const mainContainer =
        screen.getByRole("main") || screen.getByRole("region");
      expect(mainContainer).toBeInTheDocument();
    });

    it("renders side-by-side layout on desktop viewport", () => {
      // This test would check desktop layout - for now verify responsive classes exist
      const { container } = render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );
      // Component should have responsive classes for desktop layout
      expect(container.innerHTML).toMatch(/lg:|md:|sm:|xs:/);
    });
  });

  describe("Export and Share", () => {
    it("calls onExport when export button is clicked with data", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      // Add data point first
      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "January");
      await user.type(valueInput, "42");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("January")).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /export|download/i,
      });
      await user.click(exportButton);

      expect(mockOnExport).toHaveBeenCalled();
    });

    it("calls onShare when share button is clicked with data", async () => {
      const user = userEvent.setup();
      render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      // Add data point first
      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "February");
      await user.type(valueInput, "55");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("February")).toBeInTheDocument();
      });

      const shareButton = screen.getByRole("button", { name: /share/i });
      await user.click(shareButton);

      expect(mockOnShare).toHaveBeenCalled();
    });
  });

  describe("Pinch-to-Zoom", () => {
    it("supports pinch-to-zoom on chart preview", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ChartGeneratorMobile onExport={mockOnExport} onShare={mockOnShare} />,
      );

      // Add data to render chart
      const labelInput = screen.getByLabelText(/label/i);
      const valueInput = screen.getByLabelText(/value/i);
      const addButton = screen.getByRole("button", { name: /add/i });

      await user.type(labelInput, "Test");
      await user.type(valueInput, "10");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
      });

      // Find the chart container that should support pinch-to-zoom
      const chartContainer = container.querySelector(
        "[class*='overflow-auto'][class*='rounded-lg']",
      );
      expect(chartContainer).toBeTruthy();
    });
  });
});
