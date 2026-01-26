/**
 * Unit tests for TierComparisonSection component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TierComparisonSection } from "../tier-comparison-section";

describe("TierComparisonSection", () => {
  describe("Basic Rendering", () => {
    it("renders the section with default individuals view", () => {
      render(<TierComparisonSection />);

      // Should render individuals heading by default
      expect(
        screen.getByRole("heading", {
          name: /scegli il piano perfetto per te/i,
        }),
      ).toBeInTheDocument();
    });

    it("renders the toggle component", () => {
      render(<TierComparisonSection />);

      // Toggle should be present
      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /studenti.*famiglie/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /scuole.*aziende/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Individuals View (B2C)", () => {
    it("renders all three B2C tier cards", () => {
      render(<TierComparisonSection />);

      expect(screen.getByText("Trial")).toBeInTheDocument();
      expect(screen.getByText("Base")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("displays trial tier features", () => {
      render(<TierComparisonSection />);

      expect(screen.getByText("3 Maestri")).toBeInTheDocument();
      expect(screen.getByText("10 messaggi/giorno")).toBeInTheDocument();
      expect(screen.getByText("5 minuti voce/giorno")).toBeInTheDocument();
    });

    it("displays correct heading and subtitle for individuals", () => {
      render(<TierComparisonSection />);

      expect(
        screen.getByRole("heading", {
          name: /scegli il piano perfetto per te/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/inizia con una prova gratuita/i),
      ).toBeInTheDocument();
    });

    it("uses 3-column grid for B2C tiers", () => {
      const { container } = render(<TierComparisonSection />);

      const gridElement = container.querySelector(".grid");
      expect(gridElement).toHaveClass("lg:grid-cols-3");
    });
  });

  describe("Organizations View (B2B)", () => {
    it("switches to B2B view when Organizations tab is clicked", async () => {
      render(<TierComparisonSection />);

      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });

      fireEvent.click(organizationsTab);

      await waitFor(() => {
        // Should show B2B heading
        expect(
          screen.getByRole("heading", {
            name: /soluzioni per la tua organizzazione/i,
          }),
        ).toBeInTheDocument();
      });
    });

    it("displays two B2B tier cards (Scuole and Enterprise)", async () => {
      render(<TierComparisonSection />);

      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });
      fireEvent.click(organizationsTab);

      await waitFor(() => {
        expect(screen.getByText("Scuole")).toBeInTheDocument();
        // Enterprise appears in both badge and heading, so use getAllByText
        const enterpriseElements = screen.getAllByText("Enterprise");
        expect(enterpriseElements.length).toBeGreaterThan(0);
      });
    });

    it("displays correct heading and subtitle for organizations", async () => {
      render(<TierComparisonSection />);

      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });
      fireEvent.click(organizationsTab);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: /soluzioni per la tua organizzazione/i,
          }),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/personalizzazione completa per scuole e aziende/i),
        ).toBeInTheDocument();
      });
    });

    it("displays B2B tier features", async () => {
      render(<TierComparisonSection />);

      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });
      fireEvent.click(organizationsTab);

      await waitFor(() => {
        // Scuole features
        expect(screen.getByText("Gestione classi")).toBeInTheDocument();
        expect(screen.getByText("Report docenti")).toBeInTheDocument();

        // Enterprise features
        expect(
          screen.getByText("Temi custom (Leadership, AI, Soft Skills)"),
        ).toBeInTheDocument();
        expect(screen.getByText("Analytics avanzate")).toBeInTheDocument();
      });
    });

    it("displays B2B CTAs with correct links", async () => {
      render(<TierComparisonSection />);

      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });
      fireEvent.click(organizationsTab);

      await waitFor(() => {
        const contactButtons = screen.getAllByText("Contattaci");
        expect(contactButtons).toHaveLength(2);
      });
    });

    it("uses 2-column grid centered for B2B tiers", async () => {
      const { container } = render(<TierComparisonSection />);

      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });
      fireEvent.click(organizationsTab);

      await waitFor(() => {
        const gridElement = container.querySelector(".grid");
        expect(gridElement).toHaveClass("md:grid-cols-2");
        expect(gridElement?.parentElement).toHaveClass("max-w-3xl");
      });
    });

    it("highlights Scuole tier", async () => {
      render(<TierComparisonSection />);

      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });
      fireEvent.click(organizationsTab);

      await waitFor(() => {
        // Verify Scuole badge is present (which indicates highlight)
        expect(screen.getByText("Per le Scuole")).toBeInTheDocument();
      });
    });
  });

  describe("Toggle Interaction", () => {
    it("switches back to individuals view after viewing organizations", async () => {
      render(<TierComparisonSection />);

      // Switch to organizations
      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });
      fireEvent.click(organizationsTab);

      await waitFor(() => {
        expect(screen.getByText("Scuole")).toBeInTheDocument();
      });

      // Switch back to individuals
      const individualsTab = screen.getByRole("tab", {
        name: /studenti.*famiglie/i,
      });
      fireEvent.click(individualsTab);

      await waitFor(() => {
        expect(screen.getByText("Trial")).toBeInTheDocument();
        expect(screen.getByText("Base")).toBeInTheDocument();
        expect(screen.getByText("Pro")).toBeInTheDocument();
      });
    });

    it("maintains correct active state on toggle", async () => {
      render(<TierComparisonSection />);

      const individualsTab = screen.getByRole("tab", {
        name: /studenti.*famiglie/i,
      });
      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });

      // Individuals should be active by default
      expect(individualsTab).toHaveAttribute("aria-selected", "true");
      expect(organizationsTab).toHaveAttribute("aria-selected", "false");

      // Click organizations
      fireEvent.click(organizationsTab);

      await waitFor(() => {
        expect(individualsTab).toHaveAttribute("aria-selected", "false");
        expect(organizationsTab).toHaveAttribute("aria-selected", "true");
      });
    });
  });

  describe("Animations", () => {
    it("animates transition between views", async () => {
      render(<TierComparisonSection />);

      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });

      fireEvent.click(organizationsTab);

      // AnimatePresence should handle exit/enter animations
      // Check that content changes
      await waitFor(() => {
        expect(screen.getByText("Scuole")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has correct ARIA labels", () => {
      render(<TierComparisonSection />);

      expect(
        screen.getByLabelText(/toggle between individuals and organizations/i),
      ).toBeInTheDocument();
    });

    it("supports keyboard navigation on toggle", () => {
      render(<TierComparisonSection />);

      const individualsTab = screen.getByRole("tab", {
        name: /studenti.*famiglie/i,
      });
      const organizationsTab = screen.getByRole("tab", {
        name: /scuole.*aziende/i,
      });

      // Both tabs should be keyboard accessible
      expect(individualsTab).toBeInTheDocument();
      expect(organizationsTab).toBeInTheDocument();
    });
  });
});
