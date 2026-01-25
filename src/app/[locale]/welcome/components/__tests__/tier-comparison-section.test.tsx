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

    expect(screen.getByText("Trial")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("displays trial tier features", () => {
    render(<TierComparisonSection />);

    // Trial tier should show limited features
    expect(screen.getByText("3 Maestri")).toBeInTheDocument();
    expect(screen.getByText("10 messaggi/giorno")).toBeInTheDocument();
    expect(screen.getByText("5 minuti voce/giorno")).toBeInTheDocument();
  });

  it("displays base tier features", () => {
    render(<TierComparisonSection />);

    // Base tier should show expanded features
    expect(screen.getByText("10 Maestri")).toBeInTheDocument();
    expect(screen.getByText("30 messaggi/giorno")).toBeInTheDocument();
    expect(screen.getByText("15 minuti voce/giorno")).toBeInTheDocument();
  });

  it("displays pro tier features", () => {
    render(<TierComparisonSection />);

    // Pro tier should show unlimited or high limits
    expect(screen.getByText("22 Maestri")).toBeInTheDocument();
    expect(screen.getByText("Messaggi illimitati")).toBeInTheDocument();
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
      screen.getByRole("button", { name: /upgrade a pro/i }),
    ).toBeInTheDocument();
  });

  it("highlights pro tier as recommended", () => {
    render(<TierComparisonSection />);

    // Pro card should have a "Consigliato" badge
    expect(screen.getByText(/consigliato/i)).toBeInTheDocument();
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
    const gratisElements = screen.getAllByText("Gratis");
    expect(gratisElements.length).toBe(2);

    // Pro tier shows custom pricing
    expect(screen.getByText("A richiesta")).toBeInTheDocument();
  });
});
