/* eslint-disable security/detect-non-literal-regexp -- test file uses getTranslation() helper which escapes all regex chars */
/**
 * Unit tests for TierComparisonSection component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierComparisonSection } from "../tier-comparison-section";
import { getTranslation } from "@/test/i18n-helpers";

describe("TierComparisonSection", () => {
  it("renders the section heading", () => {
    render(<TierComparisonSection />);

    const heading = getTranslation("welcome.tierComparison.heading");
    expect(
      screen.getByRole("heading", {
        name: new RegExp(heading.split(" ")[0], "i"),
      }),
    ).toBeInTheDocument();
  });

  it("renders all three tier cards", () => {
    render(<TierComparisonSection />);

    const trialName = getTranslation("welcome.tierComparison.tiers.trial.name");
    const baseName = getTranslation("welcome.tierComparison.tiers.base.name");
    const proName = getTranslation("welcome.tierComparison.tiers.pro.name");
    expect(screen.getByText(trialName)).toBeInTheDocument();
    expect(screen.getByText(baseName)).toBeInTheDocument();
    expect(screen.getByText(proName)).toBeInTheDocument();
  });

  it("displays trial tier features", () => {
    render(<TierComparisonSection />);

    // Trial tier should show limited features
    const maestriFeature = getTranslation(
      "welcome.tierComparison.tiers.trial.features.maestri",
    );
    const messagesFeature = getTranslation(
      "welcome.tierComparison.tiers.trial.features.messages",
    );
    const voiceFeature = getTranslation(
      "welcome.tierComparison.tiers.trial.features.voice",
    );
    expect(
      screen.getByText(new RegExp(maestriFeature, "i")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(messagesFeature, "i")),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(voiceFeature, "i"))).toBeInTheDocument();
  });

  it("displays base tier features", () => {
    render(<TierComparisonSection />);

    // Base tier should show expanded features (matching actual i18n translations)
    const baseMaestri = getTranslation(
      "welcome.tierComparison.tiers.base.features.maestri",
    );
    const baseMessages = getTranslation(
      "welcome.tierComparison.tiers.base.features.messages",
    );
    const baseVoice = getTranslation(
      "welcome.tierComparison.tiers.base.features.voice",
    );
    expect(screen.getByText(new RegExp(baseMaestri, "i"))).toBeInTheDocument();
    // Multiple tiers share unlimited text so use getAllByText
    expect(
      screen.getAllByText(new RegExp(baseMessages, "i")).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(new RegExp(baseVoice, "i")).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("displays pro tier features", () => {
    render(<TierComparisonSection />);

    // Pro tier should show unlimited or high limits (matching actual i18n translations)
    const proMaestri = getTranslation(
      "welcome.tierComparison.tiers.pro.features.maestri",
    );
    const proMessages = getTranslation(
      "welcome.tierComparison.tiers.pro.features.messagesUnlimited",
    );
    expect(screen.getByText(new RegExp(proMaestri, "i"))).toBeInTheDocument();
    expect(
      screen.getAllByText(new RegExp(proMessages, "i")).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders CTA buttons for each tier", () => {
    render(<TierComparisonSection />);

    const trialCta = getTranslation("welcome.tierComparison.tiers.trial.cta");
    const baseCta = getTranslation("welcome.tierComparison.tiers.base.cta");
    const proCta = getTranslation("welcome.tierComparison.tiers.pro.cta");
    expect(
      screen.getByRole("button", { name: new RegExp(trialCta, "i") }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(baseCta, "i") }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(proCta, "i") }),
    ).toBeInTheDocument();
  });

  it("highlights pro tier as recommended", () => {
    render(<TierComparisonSection />);

    // Pro card should have a badge
    const proBadge = getTranslation("welcome.tierComparison.tiers.pro.badge");
    const badges = screen.getAllByText(new RegExp(proBadge, "i"));
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("is responsive on mobile", () => {
    const { container } = render(<TierComparisonSection />);

    // Grid should stack on mobile (grid-cols-1) and be side-by-side on larger screens
    const gridElement = container.querySelector(".grid");
    expect(gridElement).toHaveClass("grid-cols-1");
    expect(gridElement).toHaveClass("lg:grid-cols-3");
  });

  it("displays pricing information", () => {
    render(<TierComparisonSection />);

    // Trial and Base are both free (2 occurrences)
    const trialPrice = getTranslation(
      "welcome.tierComparison.tiers.trial.price",
    );
    const gratisElements = screen.getAllByText(trialPrice);
    expect(gratisElements.length).toBe(2);

    // Pro tier shows custom pricing
    const proPrice = getTranslation("welcome.tierComparison.tiers.pro.price");
    expect(screen.getByText(proPrice)).toBeInTheDocument();
  });
});
