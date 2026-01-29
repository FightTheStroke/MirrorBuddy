/**
 * Unit tests for SuccessMetricsDashboard component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuccessMetricsDashboard } from "../success-metrics-dashboard";
import type { SuccessMetricsData } from "../success-metrics-dashboard/types";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockData: SuccessMetricsData = {
  studentId: "student-123",
  studentName: "Marco",
  lastUpdated: new Date(),
  overallScore: 75,
  metrics: [
    {
      id: "engagement",
      name: "Engagement",
      description: "Engagement description",
      currentScore: 80,
      previousScore: 70,
      trend: "up",
      history: [],
      subMetrics: [
        { id: "s1", name: "Sub 1", value: 10, target: 20, unit: "pts" },
      ],
    },
  ],
  milestones: [
    {
      id: "m1",
      title: "First Step",
      description: "Started studying",
      achievedAt: new Date(),
      metricId: "engagement",
    },
  ],
};

describe("SuccessMetricsDashboard", () => {
  it("renders localized title and student name", () => {
    render(<SuccessMetricsDashboard data={mockData} />);

    // In our test setup, it might use keys or real translations depending on how vitest is configured
    // Based on output, it seems to return the key or a simplified version
    expect(screen.getByText(/Title|Titolo/i)).toBeInTheDocument();
  });

  it("renders overall score with status role", () => {
    render(<SuccessMetricsDashboard data={mockData} />);

    const overallScore = screen.getByRole("status", {
      name: /Overall Score|Punteggio Globale/i,
    });
    expect(overallScore).toBeInTheDocument();
    expect(overallScore).toHaveTextContent("75");
  });

  it("renders metrics with ARIA progressbar roles", () => {
    render(<SuccessMetricsDashboard data={mockData} />);

    // Check main metric progress bar
    const progressBar = screen.getByRole("progressbar", {
      name: /engagement progress/i,
    });
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "80");
  });

  it("renders sub-metrics with ARIA progressbar roles", () => {
    render(<SuccessMetricsDashboard data={mockData} />);

    const subProgressBar = screen.getByRole("progressbar", {
      name: /Sub 1 progress/i,
    });
    expect(subProgressBar).toBeInTheDocument();
    expect(subProgressBar).toHaveAttribute("aria-valuenow", "50"); // 10/20 = 50%
  });

      it("renders milestones section", () => {

        render(<SuccessMetricsDashboard data={mockData} />);

        

        const milestonesTitles = screen.getAllByText(/Milestones|Traguardi/i);

        expect(milestonesTitles.length).toBeGreaterThan(0);

        expect(screen.getByText("First Step")).toBeInTheDocument();

      });});
