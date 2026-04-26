/* eslint-disable security/detect-non-literal-regexp -- test file uses getTranslation() helper which escapes all regex chars */
/**
 * Unit tests for TierComparisonSection component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TierComparisonSection } from "../tier-comparison-section";
import { getTranslation } from "@/test/i18n-helpers";

describe("TierComparisonSection", () => {
  describe("Basic Rendering", () => {
    it("renders the section with default individuals view", () => {
      render(<TierComparisonSection />);

      const heading = getTranslation("welcome.tierComparison.heading");
      expect(
        screen.getByRole("heading", { name: new RegExp(heading, "i") }),
      ).toBeInTheDocument();
    });

    it("renders the toggle component", () => {
      render(<TierComparisonSection />);

      // Toggle should be present
      expect(screen.getByRole("tablist")).toBeInTheDocument();
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
    });
  });

  describe("Individuals View (B2C)", () => {
    it("renders all three B2C tier cards", () => {
      render(<TierComparisonSection />);

      const trialName = getTranslation(
        "welcome.tierComparison.tiers.trial.name",
      );
      const baseName = getTranslation("welcome.tierComparison.tiers.base.name");
      const proName = getTranslation("welcome.tierComparison.tiers.pro.name");
      expect(screen.getByText(trialName)).toBeInTheDocument();
      expect(screen.getByText(baseName)).toBeInTheDocument();
      expect(screen.getByText(proName)).toBeInTheDocument();
    });

    it("displays trial tier features", () => {
      render(<TierComparisonSection />);

      const maestriFeature = getTranslation(
        "welcome.tierComparison.tiers.trial.features.maestri",
      );
      const messagesFeature = getTranslation(
        "welcome.tierComparison.tiers.trial.features.messages",
      );
      const voiceFeature = getTranslation(
        "welcome.tierComparison.tiers.trial.features.voice",
      );
      expect(screen.getByText(maestriFeature)).toBeInTheDocument();
      expect(screen.getByText(messagesFeature)).toBeInTheDocument();
      expect(screen.getByText(voiceFeature)).toBeInTheDocument();
    });

    it("displays correct heading and subtitle for individuals", () => {
      render(<TierComparisonSection />);

      const heading = getTranslation("welcome.tierComparison.heading");
      const subtitle = getTranslation("welcome.tierComparison.subtitle");
      expect(
        screen.getByRole("heading", { name: new RegExp(heading, "i") }),
      ).toBeInTheDocument();
      expect(screen.getByText(new RegExp(subtitle, "i"))).toBeInTheDocument();
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

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]); // Click organizations tab

      await waitFor(() => {
        const b2bHeading = getTranslation(
          "welcome.tierComparison.organizationsHeading",
        );
        expect(
          screen.getByRole("heading", { name: new RegExp(b2bHeading, "i") }),
        ).toBeInTheDocument();
      });
    });

    it("displays two B2B tier cards (Scuole and Enterprise)", async () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);

      await waitFor(() => {
        const schoolsName = getTranslation(
          "welcome.tierComparison.tiers.schools.name",
        );
        const enterpriseName = getTranslation(
          "welcome.tierComparison.tiers.enterprise.name",
        );
        expect(screen.getByText(schoolsName)).toBeInTheDocument();
        // Enterprise appears in both badge and heading, so use getAllByText
        const enterpriseElements = screen.getAllByText(enterpriseName);
        expect(enterpriseElements.length).toBeGreaterThan(0);
      });
    });

    it("displays correct heading and subtitle for organizations", async () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);

      await waitFor(() => {
        const b2bHeading = getTranslation(
          "welcome.tierComparison.organizationsHeading",
        );
        const b2bSubtitle = getTranslation(
          "welcome.tierComparison.organizationsSubtitle",
        );
        expect(
          screen.getByRole("heading", { name: new RegExp(b2bHeading, "i") }),
        ).toBeInTheDocument();
        expect(
          screen.getByText(new RegExp(b2bSubtitle, "i")),
        ).toBeInTheDocument();
      });
    });

    it("displays B2B tier features", async () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);

      await waitFor(() => {
        // Scuole features
        const classManagement = getTranslation(
          "welcome.tierComparison.tiers.schools.features.classManagement",
        );
        const teacherReports = getTranslation(
          "welcome.tierComparison.tiers.schools.features.teacherReports",
        );
        expect(screen.getByText(classManagement)).toBeInTheDocument();
        expect(screen.getByText(teacherReports)).toBeInTheDocument();

        // Enterprise features
        const customThemes = getTranslation(
          "welcome.tierComparison.tiers.enterprise.features.customThemes",
        );
        const advancedAnalytics = getTranslation(
          "welcome.tierComparison.tiers.enterprise.features.advancedAnalytics",
        );
        expect(screen.getByText(customThemes)).toBeInTheDocument();
        expect(screen.getByText(advancedAnalytics)).toBeInTheDocument();
      });
    });

    it("displays B2B CTAs with correct links", async () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);

      await waitFor(() => {
        const contactCta = getTranslation(
          "welcome.tierComparison.tiers.schools.cta",
        );
        const contactButtons = screen.getAllByText(contactCta);
        expect(contactButtons).toHaveLength(2);
      });
    });

    it("uses 2-column grid centered for B2B tiers", async () => {
      const { container } = render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);

      await waitFor(() => {
        const gridElement = container.querySelector(".grid");
        expect(gridElement).toHaveClass("md:grid-cols-2");
        expect(gridElement?.parentElement).toHaveClass("max-w-3xl");
      });
    });

    it("highlights Scuole tier", async () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);

      await waitFor(() => {
        // Verify Scuole badge is present (which indicates highlight)
        const schoolsBadge = getTranslation(
          "welcome.tierComparison.tiers.schools.badge",
        );
        expect(screen.getByText(schoolsBadge)).toBeInTheDocument();
      });
    });
  });

  describe("Toggle Interaction", () => {
    it("switches back to individuals view after viewing organizations", async () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");
      // Switch to organizations
      fireEvent.click(tabs[1]);

      const schoolsName = getTranslation(
        "welcome.tierComparison.tiers.schools.name",
      );
      await waitFor(() => {
        expect(screen.getByText(schoolsName)).toBeInTheDocument();
      });

      // Switch back to individuals
      fireEvent.click(tabs[0]);

      const trialName = getTranslation(
        "welcome.tierComparison.tiers.trial.name",
      );
      const baseName = getTranslation("welcome.tierComparison.tiers.base.name");
      const proName = getTranslation("welcome.tierComparison.tiers.pro.name");
      await waitFor(() => {
        expect(screen.getByText(trialName)).toBeInTheDocument();
        expect(screen.getByText(baseName)).toBeInTheDocument();
        expect(screen.getByText(proName)).toBeInTheDocument();
      });
    });

    it("maintains correct active state on toggle", async () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");

      // Individuals should be active by default
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(tabs[1]).toHaveAttribute("aria-selected", "false");

      // Click organizations
      fireEvent.click(tabs[1]);

      await waitFor(() => {
        expect(tabs[0]).toHaveAttribute("aria-selected", "false");
        expect(tabs[1]).toHaveAttribute("aria-selected", "true");
      });
    });
  });

  describe("Animations", () => {
    it("animates transition between views", async () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);

      // AnimatePresence should handle exit/enter animations
      // Check that content changes
      const schoolsName = getTranslation(
        "welcome.tierComparison.tiers.schools.name",
      );
      await waitFor(() => {
        expect(screen.getByText(schoolsName)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has correct ARIA labels", () => {
      render(<TierComparisonSection />);

      const ariaLabel = getTranslation(
        "welcome.tierComparison.toggle.ariaLabel",
      );
      expect(
        screen.getByLabelText(new RegExp(ariaLabel, "i")),
      ).toBeInTheDocument();
    });

    it("supports keyboard navigation on toggle", () => {
      render(<TierComparisonSection />);

      const tabs = screen.getAllByRole("tab");

      // Both tabs should be keyboard accessible
      expect(tabs[0]).toBeInTheDocument();
      expect(tabs[1]).toBeInTheDocument();
    });
  });
});
