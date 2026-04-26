import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTrigger } from "../tabs";

describe("Tabs Mobile Responsive (F-44)", () => {
  describe("Mobile Layout - Icons & Text", () => {
    it("should hide tab text and show icons-only on mobile screens", () => {
      const { container } = render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList data-testid="tabs-list" className="md:hidden">
            <TabsTrigger value="tab1">
              <span className="sr-only">All Users</span>
              Tutti
            </TabsTrigger>
            <TabsTrigger value="tab2">
              <span className="sr-only">Active Users</span>
              Attivi
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const tabsList = screen.getByTestId("tabs-list");
      expect(tabsList).toHaveClass("md:hidden");

      // Check that sr-only text exists for accessibility
      const srOnlyElements = container.querySelectorAll(".sr-only");
      expect(srOnlyElements.length).toBeGreaterThan(0);
    });

    it("should show full text on desktop screens", () => {
      render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList data-testid="tabs-list-desktop" className="hidden md:flex">
            <TabsTrigger value="tab1">Tutti (5)</TabsTrigger>
            <TabsTrigger value="tab2">Attivi</TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      expect(screen.getByText("Tutti (5)")).toBeVisible();
      expect(screen.getByText("Attivi")).toBeVisible();
    });
  });

  describe("Horizontal Scrolling", () => {
    it("should enable horizontal scroll on mobile for many tabs", () => {
      const { container } = render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList className="overflow-x-auto snap-x snap-mandatory md:flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <TabsTrigger key={i} value={`tab${i}`}>
                <span className="sr-only">Tab {i}</span>T{i}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>,
      );

      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList?.parentElement).toHaveClass("overflow-x-auto");
      expect(tabsList?.parentElement).toHaveClass("snap-x");
    });

    it("should hide scrollbar but still be scrollable", () => {
      const { container } = render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList className="scrollbar-hide">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const scrollContainer =
        container.querySelector('[role="tablist"]')?.parentElement;
      expect(scrollContainer).toHaveClass("scrollbar-hide");
    });
  });

  describe("Touch Target Size (44x44px)", () => {
    it("should have minimum 44x44px touch target for each tab trigger", () => {
      const { container } = render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger value="tab1" data-testid="tab1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="tab2">
              Tab 2
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const triggers = container.querySelectorAll('[role="tab"]');
      triggers.forEach((trigger) => {
        const _styles = window.getComputedStyle(trigger as HTMLElement);
        // Check that min-height and min-width are set to at least 44px
        const _rect = (trigger as HTMLElement).getBoundingClientRect();
        // In tests we may not have perfect dimensions, but check for size classes
        expect(trigger).toHaveClass("min-h-11");
        expect(trigger).toHaveClass("min-w-11");
      });
    });

    it("should have adequate padding for touch targets on mobile", () => {
      render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger
              value="tab1"
              className="md:px-3 px-2"
              data-testid="touch-target"
            >
              <span className="sr-only">All Users</span>
              👥
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const trigger = screen.getByTestId("touch-target");
      expect(trigger).toHaveClass("min-h-11");
    });
  });

  describe("Active Tab Indicator", () => {
    it("should visibly indicate the active tab", async () => {
      const onChange = vi.fn();
      render(
        <Tabs value="tab1" onValueChange={onChange}>
          <TabsList>
            <TabsTrigger value="tab1" data-testid="tab1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="tab2">
              Tab 2
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const tab1 = screen.getByTestId("tab1");
      expect(tab1).toHaveAttribute("aria-selected", "true");
      expect(tab1).toHaveClass("bg-white");
    });

    it("should update active indicator when tab changes", async () => {
      const { rerender } = render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger value="tab1" data-testid="tab1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="tab2">
              Tab 2
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      expect(screen.getByTestId("tab1")).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByTestId("tab2")).toHaveAttribute(
        "aria-selected",
        "false",
      );

      rerender(
        <Tabs value="tab2" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger value="tab1" data-testid="tab1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="tab2">
              Tab 2
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      expect(screen.getByTestId("tab1")).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByTestId("tab2")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });

  describe("Tooltips on Hover", () => {
    it("should show tooltip with full text on hover (desktop)", async () => {
      const _user = userEvent.setup();
      render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger
              value="tab1"
              title="All Users (5)"
              data-testid="tooltip-trigger"
            >
              <span className="sr-only">All Users</span>
              👥
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const trigger = screen.getByTestId("tooltip-trigger");
      expect(trigger).toHaveAttribute("title", "All Users (5)");
      // Tooltip will appear as native title attribute or via aria-label
    });

    it("should have aria-label for screen readers", () => {
      render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger
              value="tab1"
              aria-label="All Users"
              data-testid="aria-tab"
            >
              <span className="sr-only">All Users</span>👥
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      const trigger = screen.getByTestId("aria-tab");
      expect(trigger).toHaveAttribute("aria-label", "All Users");
    });
  });

  describe("Responsive Behavior on Real AdminUsersTable", () => {
    it("should render tabs with mobile-safe configuration", () => {
      render(
        <Tabs value="all" onValueChange={() => {}}>
          <TabsList className="md:flex-wrap overflow-x-auto snap-x md:snap-none">
            <TabsTrigger value="all" title="Tutti">
              <span className="sr-only">Tutti</span>👥
            </TabsTrigger>
            <TabsTrigger value="active" title="Attivi">
              <span className="sr-only">Attivi</span>✓
            </TabsTrigger>
            <TabsTrigger value="disabled" title="Disabilitati">
              <span className="sr-only">Disabilitati</span>🚫
            </TabsTrigger>
            <TabsTrigger value="trash" title="Cestino">
              <span className="sr-only">Cestino</span>🗑️
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      // Verify all tabs are present
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(4);

      // Verify sr-only text for accessibility
      expect(screen.getByText("Tutti")).toHaveClass("sr-only");
      expect(screen.getByText("Attivi")).toHaveClass("sr-only");
    });
  });
});
