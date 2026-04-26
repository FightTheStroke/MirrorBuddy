/**
 * Email Stats Cards Tests - Global stats display cards
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailStatsCards } from "../email-stats-cards";
import type { GlobalStats } from "@/lib/email/stats-service";

const mockStats: GlobalStats = {
  totalCampaigns: 5,
  sent: 1000,
  delivered: 950,
  opened: 400,
  bounced: 50,
  failed: 10,
  openRate: 40.0,
  deliveryRate: 95.0,
  bounceRate: 5.0,
};

describe("EmailStatsCards", () => {
  const renderComponent = (stats: GlobalStats) => {
    return render(<EmailStatsCards stats={stats} />);
  };

  it("should render all four stat cards", () => {
    renderComponent(mockStats);
    expect(screen.getByText("Email Inviate")).toBeInTheDocument();
    expect(screen.getByText("Tasso Apertura Medio")).toBeInTheDocument();
    expect(screen.getByText("Tasso Consegna Medio")).toBeInTheDocument();
    expect(screen.getByText("Tasso Rimbalzo Medio")).toBeInTheDocument();
  });

  it("should display sent count formatted with locale", () => {
    renderComponent(mockStats);
    expect(screen.getByText("1,000")).toBeInTheDocument();
  });

  it("should display openRate as percentage with one decimal", () => {
    renderComponent(mockStats);
    expect(screen.getByText("40.0%")).toBeInTheDocument();
  });

  it("should display deliveryRate as percentage", () => {
    renderComponent(mockStats);
    expect(screen.getByText("95.0%")).toBeInTheDocument();
  });

  it("should display bounceRate as percentage", () => {
    renderComponent(mockStats);
    expect(screen.getByText("5.0%")).toBeInTheDocument();
  });

  it("should render cards in responsive grid layout", () => {
    const { container } = renderComponent(mockStats);
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-4");
  });

  it("should handle zero stats gracefully", () => {
    const zeroStats: GlobalStats = {
      totalCampaigns: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      bounced: 0,
      failed: 0,
      openRate: 0,
      deliveryRate: 0,
      bounceRate: 0,
    };
    renderComponent(zeroStats);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getAllByText("0.0%")).toHaveLength(3);
  });

  it("should display icons with correct accessibility attributes", () => {
    const { container } = renderComponent(mockStats);
    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons).toHaveLength(4);
  });
});
