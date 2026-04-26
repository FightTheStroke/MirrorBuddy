/**
 * Unit tests for TrialBudgetCard component
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrialBudgetCard } from "../trial-budget-card";

// Mock process.env
const originalEnv = process.env;

describe("TrialBudgetCard", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Rendering", () => {
    it("renders the trial budget card", () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "100";
      render(<TrialBudgetCard />);
      const card = screen.getByRole("heading", { name: /trial budget/i });
      expect(card).toBeInTheDocument();
    });

    it("displays the budget amount in EUR", () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "100";
      render(<TrialBudgetCard />);
      expect(screen.getByText(/€100/)).toBeInTheDocument();
    });

    it("shows the monthly description", () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "100";
      render(<TrialBudgetCard />);
      expect(screen.getByText(/mese/i)).toBeInTheDocument();
    });

    it("displays the env var name for reference", () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "100";
      const { container } = render(<TrialBudgetCard />);
      const codeElement = container.querySelector("code");
      expect(codeElement?.textContent).toContain("TRIAL_BUDGET_LIMIT_EUR");
    });

    it('shows "Configurato via env var" text', () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "100";
      render(<TrialBudgetCard />);
      expect(screen.getByText(/configurato via env var/i)).toBeInTheDocument();
    });

    it("displays default value when env var is not set", () => {
      delete process.env.TRIAL_BUDGET_LIMIT_EUR;
      render(<TrialBudgetCard />);
      expect(screen.getByText(/€100/)).toBeInTheDocument();
    });

    it("displays custom env var value", () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "250";
      render(<TrialBudgetCard />);
      expect(screen.getByText(/€250/)).toBeInTheDocument();
    });

    it("renders Euro icon", () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "100";
      render(<TrialBudgetCard />);
      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies card styling", () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "100";
      const { container } = render(<TrialBudgetCard />);
      const card = container.querySelector('[class*="border-border"]');
      expect(card).toBeInTheDocument();
    });

    it("uses read-only display styling", () => {
      process.env.TRIAL_BUDGET_LIMIT_EUR = "100";
      const { container } = render(<TrialBudgetCard />);
      // Verify no input fields exist (read-only display)
      const inputs = container.querySelectorAll("input");
      expect(inputs.length).toBe(0);
    });
  });
});
