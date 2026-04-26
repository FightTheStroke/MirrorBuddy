/**
 * Tests for LevelProgress component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelProgress } from "../level-progress";

describe("LevelProgress", () => {
  it("renders level and progress information", () => {
    render(<LevelProgress level={5} currentXP={250} xpToNextLevel={500} />);
    // Italian translation: "Livello {level}"
    expect(screen.getByText(/Livello 5/i)).toBeInTheDocument();
  });

  it("shows correct progress percentage", () => {
    const { container } = render(
      <LevelProgress level={10} currentXP={500} xpToNextLevel={1000} />,
    );
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
  });

  it("displays XP remaining to next level", () => {
    render(<LevelProgress level={3} currentXP={100} xpToNextLevel={200} />);
    // Italian translation: "{amount} MB per Livello {next}"
    expect(screen.getByText(/100 MB per Livello 4/i)).toBeInTheDocument();
  });

  it("shows max level state when at level 100", () => {
    render(<LevelProgress level={100} currentXP={0} xpToNextLevel={0} />);
    // Italian translation: "Livello Massimo"
    expect(screen.getByText(/Livello Massimo/i)).toBeInTheDocument();
  });
});
