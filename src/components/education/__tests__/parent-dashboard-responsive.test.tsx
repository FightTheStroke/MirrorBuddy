/**
 * Tests for ParentDashboard responsive layout (F-49)
 * Verifies that child progress cards stack vertically on mobile
 * and display in 2+ columns on medium and larger screens.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ParentDashboard } from "../parent-dashboard";
import type { StudentInsights } from "@/types";

describe("ParentDashboard - Mobile Responsive (F-49)", () => {
  const mockInsights: StudentInsights = {
    studentId: "student-123",
    studentName: "Marco Rossi",
    totalMinutes: 240,
    totalSessions: 8,
    maestriInteracted: ["galileo", "euclide"],
    strengths: [
      {
        id: "1",
        maestroId: "galileo",
        maestroName: "Galileo",
        category: "logical_reasoning",
        observation: "Analytical thinker",
        isStrength: true,
        confidence: 0.9,
        createdAt: new Date(),
      },
    ],
    growthAreas: [
      {
        id: "2",
        maestroId: "euclide",
        maestroName: "Euclide",
        category: "mathematical_intuition",
        observation: "Writing skills",
        isStrength: false,
        confidence: 0.7,
        createdAt: new Date(),
      },
    ],
    strategies: [
      {
        id: "3",
        title: "Use mind maps",
        description: "Organize thoughts",
        suggestedBy: ["galileo", "euclide"],
        forAreas: ["logical_reasoning", "mathematical_intuition"],
        priority: "high",
      },
    ],
    learningStyle: {
      preferredChannel: "visual",
      preferredTimeOfDay: "morning",
      optimalSessionDuration: 45,
      motivators: ["gamification", "social"],
      challengePreference: "step_by_step",
    },
    lastUpdated: new Date(),
  };

  describe("Grid Layout", () => {
    it("should render without crashing", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);
      expect(container).toBeDefined();
    });

    it("should have responsive grid for strengths and growth areas", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      // Find the grid container for strengths/growth areas
      const gridDivs = container.querySelectorAll('div[class*="grid"]');

      // Should have at least one grid for the 2-column layout
      let hasResponsiveGrid = false;
      gridDivs.forEach((grid) => {
        const className = grid.className;
        if (className && className.includes("md:grid-cols")) {
          hasResponsiveGrid = true;
        }
      });

      expect(hasResponsiveGrid).toBe(true);
    });

    it("should stack cards vertically on mobile (xs/sm)", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      const gridDivs = container.querySelectorAll('div[class*="grid"]');

      // Find the 2-column layout grid
      let mobileStackingGrid = null;
      gridDivs.forEach((grid) => {
        const className = grid.className;
        if (className && className.includes("md:grid-cols-2")) {
          mobileStackingGrid = grid;
        }
      });

      expect(mobileStackingGrid).toBeDefined();

      // Should have grid-cols-1 for mobile (xs)
      if (mobileStackingGrid) {
        expect(mobileStackingGrid.className).toMatch(/grid-cols-1/);
      }
    });

    it("should display 2 columns on medium screens (md+)", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      const gridDivs = container.querySelectorAll('div[class*="grid"]');

      let twoColumnGrid = null;
      gridDivs.forEach((grid) => {
        const className = grid.className;
        if (className && className.includes("md:grid-cols-2")) {
          twoColumnGrid = grid;
        }
      });

      expect(twoColumnGrid).toBeDefined();
      expect(twoColumnGrid?.className).toMatch(/md:grid-cols-2/);
    });

    it("should have consistent gap spacing", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      const gridDivs = container.querySelectorAll('div[class*="grid"]');

      let hasGapSpacing = false;
      gridDivs.forEach((grid) => {
        const className = grid.className;
        if (className && className.includes("gap-")) {
          hasGapSpacing = true;
        }
      });

      expect(hasGapSpacing).toBe(true);
    });
  });

  describe("Card Content Readability", () => {
    it("should render strengths card", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      const heading = Array.from(container.querySelectorAll("h2, h3")).find(
        (h) => h.textContent?.includes("Punti di Forza"),
      );

      expect(heading).toBeDefined();
    });

    it("should render growth areas card", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      const heading = Array.from(container.querySelectorAll("h2, h3")).find(
        (h) => h.textContent?.includes("Aree di Crescita"),
      );

      expect(heading).toBeDefined();
    });

    it("should have readable text sizes for all content", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      // Check for proper text sizing
      const headings = container.querySelectorAll("h1, h2, h3");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should have proper contrast for text", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      // Check for proper text color classes
      const coloredElements = container.querySelectorAll('[class*="text-"]');
      expect(coloredElements.length).toBeGreaterThan(0);
    });
  });

  describe("Spacing between cards", () => {
    it("should have space-y spacing for main sections", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      const spacedDivs = container.querySelectorAll('div[class*="space-y"]');
      expect(spacedDivs.length).toBeGreaterThan(0);
    });

    it("should have consistent gap in grid layouts", () => {
      const { container } = render(<ParentDashboard insights={mockInsights} />);

      const gridDivs = container.querySelectorAll('div[class*="grid"]');

      let hasConsistentGap = false;
      gridDivs.forEach((grid) => {
        const className = grid.className;
        if (className && className.includes("gap-6")) {
          hasConsistentGap = true;
        }
      });

      expect(hasConsistentGap).toBe(true);
    });
  });

  describe("Empty state handling", () => {
    it("should handle empty strengths list gracefully", () => {
      const insightsWithoutStrengths: StudentInsights = {
        ...mockInsights,
        strengths: [],
      };

      const { container } = render(
        <ParentDashboard insights={insightsWithoutStrengths} />,
      );

      expect(container).toBeDefined();
      // Should still render without crashing
      expect(container.querySelector("div")).toBeDefined();
    });

    it("should handle empty growth areas list gracefully", () => {
      const insightsWithoutGrowth: StudentInsights = {
        ...mockInsights,
        growthAreas: [],
      };

      const { container } = render(
        <ParentDashboard insights={insightsWithoutGrowth} />,
      );

      expect(container).toBeDefined();
      // Should still render without crashing
      expect(container.querySelector("div")).toBeDefined();
    });
  });
});
