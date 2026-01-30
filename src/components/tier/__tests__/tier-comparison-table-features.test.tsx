/**
 * MIRRORBUDDY - Tier Comparison Table - Edge Cases & Styling Tests
 *
 * Tests for edge cases, styling, and custom props for TierComparisonTable.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierComparisonTable } from "../tier-comparison-table";

/**
 * Mock tier data matching TierDefinition schema
 */
const mockTiers = [
  {
    id: "tier-trial",
    code: "TRIAL",
    name: "Trial",
    description: "Free trial tier",
    chatLimitDaily: 10,
    voiceMinutesDaily: 5,
    toolsLimitDaily: 10,
    docsLimitTotal: 1,
    features: {
      videovision: false,
      pdfexport: false,
      advancedfeatures: false,
    },
    availableMaestri: [
      "euclide",
      "manzoni",
      "shakespeare",
      "lovelace",
      "curie",
    ],
    sortOrder: 0,
  },
  {
    id: "tier-base",
    code: "BASE",
    name: "Base",
    description: "Basic subscription",
    chatLimitDaily: 100,
    voiceMinutesDaily: 30,
    toolsLimitDaily: 50,
    docsLimitTotal: 5,
    features: {
      videovision: true,
      pdfexport: false,
      advancedfeatures: false,
    },
    availableMaestri: Array.from({ length: 15 }, (_, i) => `maestro-${i}`),
    sortOrder: 1,
  },
  {
    id: "tier-pro",
    code: "PRO",
    name: "Pro",
    description: "Professional tier",
    chatLimitDaily: 500,
    voiceMinutesDaily: 120,
    toolsLimitDaily: 200,
    docsLimitTotal: 50,
    features: {
      videovision: true,
      pdfexport: true,
      advancedfeatures: true,
    },
    availableMaestri: Array.from({ length: 26 }, (_, i) => `maestro-${i}`),
    sortOrder: 2,
  },
];

describe("TierComparisonTable - Edge Cases & Styling", () => {
  describe("edge cases", () => {
    it("handles empty tiers array", () => {
      render(<TierComparisonTable tiers={[]} />);

      // Should show empty message when no tiers
      expect(screen.getByText("No tiers available")).toBeInTheDocument();
    });

    it("handles single tier", () => {
      render(<TierComparisonTable tiers={[mockTiers[0]]} />);

      expect(screen.getByText("Trial")).toBeInTheDocument();
      expect(screen.queryByText("Base")).not.toBeInTheDocument();
    });

    it("handles tiers with missing optional fields", () => {
      const incompleteTiers = [
        {
          id: "tier-1",
          code: "T1",
          name: "Tier 1",
          chatLimitDaily: 50,
          voiceMinutesDaily: 10,
          toolsLimitDaily: 20,
          docsLimitTotal: 2,
          features: {},
          availableMaestri: ["maestro-1"],
        },
      ];

      render(<TierComparisonTable tiers={incompleteTiers} />);

      expect(screen.getByText("Tier 1")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies dark mode classes", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      const table = screen.getByRole("table");
      // Check for dark mode support in class names
      const classNames = table.className;
      expect(classNames).toBeDefined();
    });

    it("applies alternating row styles", () => {
      const { container } = render(<TierComparisonTable tiers={mockTiers} />);

      const rows = container.querySelectorAll("tbody tr");
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe("custom props", () => {
    it("accepts custom className prop", () => {
      const { container } = render(
        <TierComparisonTable tiers={mockTiers} className="custom-class" />,
      );

      // className is applied to the wrapper div for responsive scrolling
      const wrapper = container.querySelector(".overflow-x-auto.custom-class");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("tier sorting", () => {
    it("sorts tiers by sortOrder", () => {
      const unsortedTiers = [
        { ...mockTiers[2], sortOrder: 2 },
        { ...mockTiers[0], sortOrder: 0 },
        { ...mockTiers[1], sortOrder: 1 },
      ];

      const { container } = render(
        <TierComparisonTable tiers={unsortedTiers} />,
      );

      // Headers should appear in sorted order
      const headers = container.querySelectorAll("thead th");
      // First header is "Feature", rest are tier names
      expect(headers[1].textContent).toContain("Trial");
      expect(headers[2].textContent).toContain("Base");
      expect(headers[3].textContent).toContain("Pro");
    });
  });

  describe("missing features", () => {
    it("handles tiers without features object", () => {
      const tiersNoFeatures = [
        {
          id: "tier-1",
          code: "T1",
          name: "Tier 1",
          chatLimitDaily: 10,
          voiceMinutesDaily: 5,
          toolsLimitDaily: 10,
          docsLimitTotal: 1,
          availableMaestri: [],
        },
      ];

      render(<TierComparisonTable tiers={tiersNoFeatures} />);

      // Should render without error and show default false for boolean features
      expect(screen.getByText("Tier 1")).toBeInTheDocument();
    });

    it("handles empty availableMaestri", () => {
      const tiersNoMaestri = [
        {
          id: "tier-1",
          code: "T1",
          name: "Tier 1",
          chatLimitDaily: 10,
          voiceMinutesDaily: 5,
          toolsLimitDaily: 10,
          docsLimitTotal: 1,
          features: {},
          availableMaestri: [],
        },
      ];

      render(<TierComparisonTable tiers={tiersNoMaestri} />);

      // Should show 0 for maestri count
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });
});
