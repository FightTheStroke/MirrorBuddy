/**
 * Unit tests for ResearchDashboard component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResearchDashboard } from "../research-dashboard";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div>Line</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  Legend: () => <div>Legend</div>,
}));

describe("ResearchDashboard", () => {
  it("renders correctly with main sections", () => {
    render(<ResearchDashboard />);

    expect(screen.getByText("Research Analytics")).toBeInTheDocument();
    expect(screen.getByText("Total Participants")).toBeInTheDocument();
    expect(screen.getByText("Growth in Participation")).toBeInTheDocument();
    expect(
      screen.getByText("Method Efficiency by Subject"),
    ).toBeInTheDocument();
  });

  it("renders statistics cards", () => {
    render(<ResearchDashboard />);

    expect(screen.getByText("2,543")).toBeInTheDocument();
    expect(screen.getByText("15.2k")).toBeInTheDocument();
    expect(screen.getByText("+24%")).toBeInTheDocument();
  });

  it("renders learning heatmap with ARIA roles", () => {
    render(<ResearchDashboard />);

    const heatmap = screen.getByRole("grid", {
      name: /Student performance heatmap/i,
    });
    expect(heatmap).toBeInTheDocument();

    // Check for grid cells with specific labels
    expect(
      screen.getByLabelText(/Euclide with Alex: 85% Scaffolding/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Newton with Luca: 12% Scaffolding/i),
    ).toBeInTheDocument();
  });
});
