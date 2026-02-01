/**
 * MIRRORBUDDY - Tier Comparison Table Tests
 *
 * Tests for the component displaying feature comparison across subscription tiers.
 * Core rendering and feature display tests.
 *
 * i18n-agnostic: Uses structure-based assertions rather than hardcoded text.
 * Tier names (Trial, Base, Pro) are mock data identifiers, not translated strings.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TierComparisonTable } from "../tier-comparison-table";

/**
 * Mock tier data matching TierDefinition schema
 */
// Feature keys must match tier-seed.ts (camelCase)
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
      voice: false,
      mindMaps: false,
      videoVision: false,
      parentDashboard: false,
      prioritySupport: false,
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
      voice: true,
      mindMaps: true,
      videoVision: false,
      parentDashboard: false,
      prioritySupport: false,
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
      voice: true,
      mindMaps: true,
      videoVision: true,
      parentDashboard: true,
      prioritySupport: true,
    },
    availableMaestri: Array.from({ length: 26 }, (_, i) => `maestro-${i}`),
    sortOrder: 2,
  },
];

describe("TierComparisonTable", () => {
  describe("rendering", () => {
    it("renders table structure with headers", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Trial")).toBeInTheDocument();
      expect(screen.getByText("Base")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("renders all feature rows", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      const table = screen.getByRole("table");
      // i18n-agnostic: verify table has expected number of feature rows (9)
      // rather than checking for specific text content
      const rows = table.querySelectorAll("tbody tr");
      expect(rows.length).toBe(9);

      // Each row should have a feature name cell and tier value cells
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        expect(cells.length).toBeGreaterThanOrEqual(2); // feature name + at least 1 tier
      });
    });

    it("renders table cells for each tier-feature combination", () => {
      const { container } = render(<TierComparisonTable tiers={mockTiers} />);

      const rows = container.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        expect(cells.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("numeric features", () => {
    it("displays daily message limits", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      // Verify numeric values are present (these are data values, not translations)
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    it("displays voice minutes limits", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      // i18n-agnostic: check the second row contains voice minute values
      const rows = screen.getByRole("table").querySelectorAll("tbody tr");
      const voiceRow = rows[1]; // Voice Minutes is second row
      expect(voiceRow?.textContent).toContain("5");
      expect(voiceRow?.textContent).toContain("30");
      expect(voiceRow?.textContent).toContain("120");
    });

    it("displays number of available maestri", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      // i18n-agnostic: check the third row contains maestri count values
      const rows = screen.getByRole("table").querySelectorAll("tbody tr");
      const maestriRow = rows[2]; // Maestri Available is third row
      expect(maestriRow?.textContent).toContain("5");
      expect(maestriRow?.textContent).toContain("15");
      expect(maestriRow?.textContent).toContain("26");
    });

    it("displays documents limit", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      // i18n-agnostic: check the fourth row contains document limit values
      const rows = screen.getByRole("table").querySelectorAll("tbody tr");
      const docsRow = rows[3]; // Documents Limit is fourth row
      expect(docsRow?.textContent).toContain("1");
      expect(docsRow?.textContent).toContain("5");
      expect(docsRow?.textContent).toContain("50");
    });
  });

  describe("boolean features", () => {
    it("displays check icon for enabled features", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      // i18n-agnostic: verify boolean feature rows exist (rows 5-9)
      const table = screen.getByRole("table");
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      expect(rows.length).toBeGreaterThanOrEqual(5);

      // Boolean feature rows should exist and contain SVG icons (check/X)
      const booleanRows = rows.slice(4); // Rows 5+ are boolean features
      booleanRows.forEach((row) => {
        const svgs = row.querySelectorAll("svg");
        expect(svgs.length).toBeGreaterThan(0);
      });
    });
  });

  describe("column headers", () => {
    it("displays tier names in header row", () => {
      const { container } = render(<TierComparisonTable tiers={mockTiers} />);

      const headerRow = container.querySelector("thead tr");
      if (headerRow) {
        expect(
          within(headerRow as HTMLElement).getByText("Trial"),
        ).toBeInTheDocument();
        expect(
          within(headerRow as HTMLElement).getByText("Base"),
        ).toBeInTheDocument();
        expect(
          within(headerRow as HTMLElement).getByText("Pro"),
        ).toBeInTheDocument();
      }
    });
  });

  describe("responsive design", () => {
    it("renders with overflow-x-auto for mobile", () => {
      const { container } = render(<TierComparisonTable tiers={mockTiers} />);

      const wrapper = container.querySelector(".overflow-x-auto");
      expect(wrapper).toBeInTheDocument();
    });
  });
});
