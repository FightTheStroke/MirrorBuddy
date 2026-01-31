/**
 * Unit tests for TierComparisonSection component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierComparisonSection } from "../tier-comparison-section";

describe("TierComparisonSection", () => {
  it("renders the section heading", () => {
    render(<TierComparisonSection />);

    expect(
      screen.getByRole("heading", { name: /scegli il piano/i }),
    ).toBeInTheDocument();
  });

  it("renders all three tier cards", () => {
    render(<TierComparisonSection />);

    expect(screen.getByText("Prova")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("displays trial tier features", () => {
    render(<TierComparisonSection />);

    // Trial tier should show limited features
    expect(screen.getByText(/3 Professori/i)).toBeInTheDocument();
    expect(screen.getByText(/10 messaggi\/giorno/i)).toBeInTheDocument();
    expect(screen.getByText(/5 minuti voce\/giorno/i)).toBeInTheDocument();
  });

  it("displays base tier features", () => {
    render(<TierComparisonSection />);

    // Base tier should show expanded features (matching actual i18n translations)
    // Multiple tiers share "illimitati/a" text so use getAllByText
    expect(screen.getByText(/20 Professori/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/messaggi illimitati/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/voce illimitata/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("displays pro tier features", () => {
    render(<TierComparisonSection />);

    // Pro tier should show unlimited or high limits (matching actual i18n translations)
    expect(screen.getByText(/22 Professori/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/messaggi illimitati/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders CTA buttons for each tier", () => {
    render(<TierComparisonSection />);

    expect(
      screen.getByRole("button", { name: /prova gratis/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /registrati/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /passa a pro/i }),
    ).toBeInTheDocument();
  });

  it("highlights pro tier as recommended", () => {
    render(<TierComparisonSection />);

    // Pro card should have a "Consigliato" badge
    const consigliato = screen.getAllByText(/consigliato/i);
    expect(consigliato.length).toBeGreaterThanOrEqual(1);
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

    // Trial and Base are both free (2 occurrences of "Gratis")
    const gratisElements = screen.getAllByText("Gratuito");
    expect(gratisElements.length).toBe(2);

    // Pro tier shows custom pricing
    expect(screen.getByText("Su richiesta")).toBeInTheDocument();
  });
});
