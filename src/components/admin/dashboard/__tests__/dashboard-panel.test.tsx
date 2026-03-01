/**
 * DashboardPanel Component Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardPanel } from "../dashboard-panel";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("DashboardPanel", () => {
  it("renders title as h3", () => {
    render(<DashboardPanel title="Test Panel">Content</DashboardPanel>);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Test Panel",
    );
  });

  it("renders children content", () => {
    render(
      <DashboardPanel title="Panel">
        <span data-testid="child">Hello</span>
      </DashboardPanel>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("renders detail link when detailHref provided", () => {
    render(
      <DashboardPanel title="Costs" detailHref="/admin/analytics">
        Content
      </DashboardPanel>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/admin/analytics");
    expect(link).toHaveAttribute(
      "aria-label",
      "Costs — viewDetails",
    );
  });

  it("does not render link when no detailHref", () => {
    render(<DashboardPanel title="No Link">Content</DashboardPanel>);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("applies col-span-2 class when span=2", () => {
    const { container } = render(
      <DashboardPanel title="Wide" span={2}>
        Content
      </DashboardPanel>,
    );
    expect(container.firstChild).toHaveClass("md:col-span-2");
  });
});
