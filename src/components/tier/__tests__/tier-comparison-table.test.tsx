/**
 * MIRRORBUDDY - Tier Comparison Table Tests
 *
 * Tests for the component displaying feature comparison across subscription tiers.
 * Core rendering and feature display tests.
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
    availableMaestri: Array.from({ length: 22 }, (_, i) => `maestro-${i}`),
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
      expect(within(table).getByText("Daily Messages")).toBeInTheDocument();
      expect(within(table).getByText("Voice Minutes")).toBeInTheDocument();
      expect(within(table).getByText("Maestri Available")).toBeInTheDocument();
      expect(within(table).getByText("Documents Limit")).toBeInTheDocument();
      expect(within(table).getByText("Voice Chat")).toBeInTheDocument();
      expect(within(table).getByText("Mind Maps")).toBeInTheDocument();
      expect(within(table).getByText("Video Vision")).toBeInTheDocument();
      expect(within(table).getByText("Parent Dashboard")).toBeInTheDocument();
      expect(within(table).getByText("Priority Support")).toBeInTheDocument();
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

      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    it("displays voice minutes limits", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      const rows = screen.getByRole("table").querySelectorAll("tbody tr");
      let foundVoice = false;

      rows.forEach((row) => {
        if (row.textContent?.includes("Voice Minutes")) {
          expect(row.textContent).toContain("5");
          expect(row.textContent).toContain("30");
          expect(row.textContent).toContain("120");
          foundVoice = true;
        }
      });

      expect(foundVoice).toBe(true);
    });

    it("displays number of available maestri", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      const rows = screen.getByRole("table").querySelectorAll("tbody tr");
      let foundMaestri = false;

      rows.forEach((row) => {
        if (row.textContent?.includes("Maestri Available")) {
          expect(row.textContent).toContain("5");
          expect(row.textContent).toContain("15");
          expect(row.textContent).toContain("22");
          foundMaestri = true;
        }
      });

      expect(foundMaestri).toBe(true);
    });

    it("displays documents limit", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      const rows = screen.getByRole("table").querySelectorAll("tbody tr");
      let foundDocs = false;

      rows.forEach((row) => {
        if (row.textContent?.includes("Documents Limit")) {
          expect(row.textContent).toContain("1");
          expect(row.textContent).toContain("5");
          expect(row.textContent).toContain("50");
          foundDocs = true;
        }
      });

      expect(foundDocs).toBe(true);
    });
  });

  describe("boolean features", () => {
    it("displays check icon for enabled features", () => {
      render(<TierComparisonTable tiers={mockTiers} />);

      const table = screen.getByRole("table");
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      let foundVideoVision = false;

      rows.forEach((row) => {
        if (row.textContent?.includes("Video Vision")) {
          foundVideoVision = true;
        }
      });

      expect(foundVideoVision).toBe(true);
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
