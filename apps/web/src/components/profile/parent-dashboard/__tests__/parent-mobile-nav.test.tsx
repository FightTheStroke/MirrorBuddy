import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParentMobileNav } from "../parent-mobile-nav";
import type { DashboardTab } from "../dashboard-tabs";

describe("ParentMobileNav", () => {
  const mockTabs: Array<{
    value: DashboardTab;
    label: string;
    icon: React.ComponentType<any>;
  }> = [
    {
      value: "panoramica",
      label: "Panoramica",
      icon: () => <div data-testid="panoramica-icon">📊</div>,
    },
    {
      value: "progressi",
      label: "Progressi",
      icon: () => <div data-testid="progressi-icon">📈</div>,
    },
    {
      value: "osservazioni",
      label: "Osservazioni",
      icon: () => <div data-testid="osservazioni-icon">💬</div>,
    },
    {
      value: "guida",
      label: "Guida",
      icon: () => <div data-testid="guida-icon">❓</div>,
    },
    {
      value: "accessibilita",
      label: "Accessibilità",
      icon: () => <div data-testid="accessibility-icon">♿</div>,
    },
  ];

  const defaultProps = {
    activeTab: "panoramica" as DashboardTab,
    onTabChange: vi.fn(),
  };

  it("renders mobile nav component", () => {
    render(<ParentMobileNav {...defaultProps} />);
    expect(
      screen.getByRole("navigation", { name: /parent dashboard navigation/i }),
    ).toBeInTheDocument();
  });

  it("shows hamburger menu on mobile", () => {
    render(<ParentMobileNav {...defaultProps} />);
    const hamburger = screen.getByRole("button", { name: /menu/i });
    expect(hamburger).toBeInTheDocument();
  });

  it("hamburger button has 44x44px minimum touch target", () => {
    render(<ParentMobileNav {...defaultProps} />);
    const hamburger = screen.getByRole("button", { name: /menu/i });
    // Check for h-11 and w-11 classes which equals 44px (11 * 4px = 44px)
    expect(hamburger).toHaveClass("h-11");
    expect(hamburger).toHaveClass("w-11");
  });

  it("displays all navigation tabs when menu is open", async () => {
    const user = userEvent.setup();
    render(<ParentMobileNav {...defaultProps} />);
    const hamburger = screen.getByRole("button", { name: /menu/i });

    await user.click(hamburger);

    mockTabs.forEach(({ label }) => {
      const tabs = screen.getAllByText(label);
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  it("highlights active tab visually", async () => {
    const user = userEvent.setup();
    render(<ParentMobileNav {...defaultProps} activeTab="panoramica" />);

    const hamburger = screen.getByRole("button", { name: /menu/i });
    await user.click(hamburger);

    // Check that active tab indicator exists
    const activeIndicator = screen
      .getAllByRole("menuitem")
      .find((item) => item.textContent?.includes("Panoramica"));
    expect(activeIndicator).toHaveAttribute("aria-current", "page");
  });

  it("calls onTabChange when tab is clicked", async () => {
    const user = userEvent.setup();
    const mockOnTabChange = vi.fn();
    render(<ParentMobileNav {...defaultProps} onTabChange={mockOnTabChange} />);

    const hamburger = screen.getByRole("button", { name: /menu/i });
    await user.click(hamburger);

    const menuItems = screen.getAllByRole("menuitem");
    const progressiTab = menuItems.find((item) =>
      item.textContent?.includes("Progressi"),
    );
    expect(progressiTab).toBeDefined();
    if (progressiTab) {
      await user.click(progressiTab);
      expect(mockOnTabChange).toHaveBeenCalledWith("progressi");
    }
  });

  it("closes menu when tab is selected", async () => {
    const user = userEvent.setup();
    render(<ParentMobileNav {...defaultProps} />);

    const hamburger = screen.getByRole("button", { name: /menu/i });
    await user.click(hamburger);

    let menuContent = screen.getByRole("navigation");
    expect(menuContent).toHaveAttribute("data-open", "true");

    const menuItems = screen.getAllByRole("menuitem");
    const progressiTab = menuItems.find((item) =>
      item.textContent?.includes("Progressi"),
    );
    if (progressiTab) {
      await user.click(progressiTab);
      menuContent = screen.getByRole("navigation");
      expect(menuContent).toHaveAttribute("data-open", "false");
    }
  });

  it("is hidden on desktop (md+)", () => {
    render(<ParentMobileNav {...defaultProps} />);
    const mobileNav = screen.getByRole("navigation", {
      name: /parent dashboard navigation/i,
    });

    // Check that component has md:hidden class
    expect(mobileNav).toHaveClass("md:hidden");
  });

  it("has proper keyboard accessibility", async () => {
    const user = userEvent.setup();
    render(<ParentMobileNav {...defaultProps} />);

    const hamburger = screen.getByRole("button", { name: /menu/i });

    // Should be focusable
    await user.tab();
    expect(hamburger).toHaveFocus();

    // Should open with Enter
    await user.keyboard("{Enter}");
    const menuContent = screen.getByRole("navigation");
    expect(menuContent).toHaveAttribute("data-open", "true");
  });

  it("closes menu when Escape key is pressed", async () => {
    const user = userEvent.setup();
    render(<ParentMobileNav {...defaultProps} />);

    const hamburger = screen.getByRole("button", { name: /menu/i });
    await user.click(hamburger);

    let menuContent = screen.getByRole("navigation");
    expect(menuContent).toHaveAttribute("data-open", "true");

    await user.keyboard("{Escape}");
    menuContent = screen.getByRole("navigation");
    expect(menuContent).toHaveAttribute("data-open", "false");
  });

  it("displays icons for all tabs", async () => {
    const user = userEvent.setup();
    render(<ParentMobileNav {...defaultProps} />);
    const hamburger = screen.getByRole("button", { name: /menu/i });
    await user.click(hamburger);

    // Check for SVG icons in the menu items
    const svgIcons = screen
      .getAllByRole("menuitem")
      .map((item) => item.querySelector("svg"));
    expect(svgIcons.filter((icon) => icon !== null).length).toBeGreaterThan(0);
  });

  it("displays tab labels for accessibility", async () => {
    const user = userEvent.setup();
    render(<ParentMobileNav {...defaultProps} />);
    const hamburger = screen.getByRole("button", { name: /menu/i });
    await user.click(hamburger);

    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems.length).toBe(mockTabs.length);
  });
});
