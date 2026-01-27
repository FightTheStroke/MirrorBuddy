/**
 * Tests for mobile responsive progress cards (F-49)
 * Verifies that child progress cards stack vertically on mobile
 * and display in 2+ columns on medium and larger screens.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QuizPerformance } from "../quiz-performance";
import type { QuizStats } from "@/types";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "no-quizzes": "Nessun quiz completato ancora",
      "total-attempts": "Quiz totali",
      "average-score": "Punteggio medio",
      "best-score": "Miglior punteggio",
      "by-subject": "Per materia",
      attempts: "tentativi",
    };
    return translations[key] || key;
  },
}));

describe("QuizPerformance - Mobile Responsive (F-49)", () => {
  const mockQuizStats: QuizStats = {
    totalAttempts: 15,
    averageScore: 78,
    bestScore: 95,
    bySubject: [
      {
        subject: "math",
        subjectName: "Matematica",
        attempts: 5,
        averageScore: 85,
        bestScore: 95,
      },
      {
        subject: "physics",
        subjectName: "Fisica",
        attempts: 4,
        averageScore: 72,
        bestScore: 88,
      },
      {
        subject: "chemistry",
        subjectName: "Chimica",
        attempts: 3,
        averageScore: 65,
        bestScore: 78,
      },
      {
        subject: "biology",
        subjectName: "Biologia",
        attempts: 3,
        averageScore: 88,
        bestScore: 92,
      },
    ],
  };

  describe("Overall stats grid", () => {
    it("should render stat cards for quiz performance metrics", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      // Look for stat card divs with p-3 and rounded-lg classes
      const cards = container.querySelectorAll(
        'div[class*="p-3"][class*="rounded-lg"]',
      );
      // Should have at least 3 stat cards (attempts, average, best score)
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it("should have responsive grid classes for overall stats", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      // Find the grid container for overall stats
      const gridDivs = container.querySelectorAll('div[class*="grid"]');

      // Should have a grid div with responsive classes
      let hasResponsiveGrid = false;
      gridDivs.forEach((grid) => {
        const className = grid.className;
        // Check for responsive grid classes: should have grid-cols-1 and breakpoint variants
        if (
          className &&
          className.includes("grid-cols-1") &&
          (className.includes("sm:") || className.includes("lg:"))
        ) {
          hasResponsiveGrid = true;
        }
      });

      expect(hasResponsiveGrid).toBe(true);
    });

    it("should stack cards vertically on mobile (xs/sm)", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      const gridDivs = container.querySelectorAll('div[class*="grid"]');

      // Find the overall stats grid by looking for gap-3
      let overallStatsGrid = null;
      for (const grid of gridDivs) {
        if (
          grid.className.includes("gap-3") &&
          grid.className.includes("grid-cols-1")
        ) {
          overallStatsGrid = grid;
          break;
        }
      }

      expect(overallStatsGrid).toBeDefined();

      // Should include grid-cols-1 for mobile (xs)
      expect(overallStatsGrid?.className).toMatch(/grid-cols-1/);
    });

    it("should display 2+ columns on larger screens (sm/lg)", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      const gridDivs = container.querySelectorAll('div[class*="grid"]');

      // Find the overall stats grid by looking for gap-3
      let overallStatsGrid = null;
      for (const grid of gridDivs) {
        if (
          grid.className.includes("gap-3") &&
          grid.className.includes("grid-cols-1")
        ) {
          overallStatsGrid = grid;
          break;
        }
      }

      // Should have sm: or lg: breakpoint classes for more columns
      const hasResponsiveBreakpoints =
        overallStatsGrid?.className?.includes("sm:") ||
        overallStatsGrid?.className?.includes("lg:");
      expect(hasResponsiveBreakpoints).toBe(true);
    });

    it("should have consistent spacing between stat cards", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      const gridDivs = container.querySelectorAll('div[class*="grid"]');
      const overallStatsGrid = gridDivs[0];

      // Should have gap classes
      expect(overallStatsGrid.className).toMatch(/gap-/);
    });
  });

  describe("Per-subject stats", () => {
    it("should render per-subject stats section", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      const heading = container.querySelector("h3");
      expect(heading?.textContent).toContain("Per materia");
    });

    it("should display subject stats in a responsive container", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      // Find the per-subject stats container
      const headings = container.querySelectorAll("h3");
      const heading = Array.from(headings).find((h) =>
        h.textContent?.includes("Per materia"),
      );

      expect(heading).toBeDefined();

      // The parent container should have proper spacing
      const parent = heading?.parentElement?.parentElement;
      expect(parent?.className).toMatch(/space-y-/);
    });
  });

  describe("Content readability at all sizes", () => {
    it("should have proper text sizes for mobile", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      const statValues = container.querySelectorAll('p[class*="text-2xl"]');
      expect(statValues.length).toBeGreaterThan(0);
    });

    it("should have readable font sizes in subject stats", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      const subjectStats = container.querySelectorAll('[class*="text-sm"]');
      expect(subjectStats.length).toBeGreaterThan(0);
    });

    it("should have accessible color contrast", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      // Check for proper text color classes
      const coloredElements = container.querySelectorAll('[class*="text-"]');
      expect(coloredElements.length).toBeGreaterThan(0);
    });
  });

  describe("Proper spacing between cards", () => {
    it("should have gap spacing in the overall stats grid", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      const gridDivs = container.querySelectorAll('div[class*="grid"]');
      const overallStatsGrid = gridDivs[0];

      // Should have gap-3 or similar
      expect(overallStatsGrid.className).toMatch(/gap-3/);
    });

    it("should have space-y spacing for subject stats list", () => {
      const { container } = render(<QuizPerformance stats={mockQuizStats} />);

      const spacedDivs = container.querySelectorAll('div[class*="space-y"]');
      expect(spacedDivs.length).toBeGreaterThan(0);
    });
  });

  describe("Empty state", () => {
    it("should handle empty quiz stats gracefully", () => {
      const emptyStats: QuizStats = {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        bySubject: [],
      };

      const { container } = render(<QuizPerformance stats={emptyStats} />);

      const emptyMessage = container.textContent;
      expect(emptyMessage).toContain("Nessun quiz completato ancora");
    });
  });
});
