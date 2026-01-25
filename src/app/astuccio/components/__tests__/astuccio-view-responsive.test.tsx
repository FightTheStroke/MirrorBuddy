/**
 * Unit tests for AstuccioView category headers responsive layout
 * Tests: F-38 - Category headers 2-row layout on mobile
 * Mobile (xs/sm): flex-col with icon + title stacked
 * Desktop (md+): flex-row with icon + title side-by-side
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AstuccioView } from "../astuccio-view";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    section: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <section {...props}>{children}</section>
    ),
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock dialog component
vi.mock("@/components/education/tool-maestro-selection-dialog", () => ({
  ToolMaestroSelectionDialog: () => <div data-testid="maestro-dialog" />,
}));

// Mock other components
vi.mock("@/components/astuccio/astuccio-info-section", () => ({
  AstuccioInfoSection: () => <div data-testid="info-section" />,
}));

vi.mock("@/components/study-kit/StudyKitView", () => ({
  StudyKitView: () => <div data-testid="study-kit-view" />,
}));

vi.mock("@/components/typing/TypingView", () => ({
  TypingView: () => <div data-testid="typing-view" />,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => (
    <div data-testid="page-header">{title}</div>
  ),
}));

describe("AstuccioView Category Headers - Responsive Layout (F-38)", () => {
  it("should render category headers", () => {
    render(<AstuccioView />);
    const headers = screen.getAllByRole("heading", { level: 2 });
    expect(headers.length).toBeGreaterThan(0);
  });

  it("should have category titles visible without truncation", () => {
    render(<AstuccioView />);
    const headers = screen.getAllByRole("heading", { level: 2 });

    headers.forEach((header) => {
      expect(header).toBeVisible();
      expect(header.textContent).toBeTruthy();
      expect(header.textContent).not.toBe("");
    });
  });

  it("should have icon containers with proper sizing", () => {
    render(<AstuccioView />);
    const headers = screen.getAllByRole("heading", { level: 2 });

    headers.forEach((header) => {
      // Navigate to the main header container
      let container = header.parentElement;
      while (container && !container.className.includes("border")) {
        container = container.parentElement;
      }
      expect(container).toBeTruthy();

      // Should have an icon container with fixed dimensions
      const iconContainer = container?.querySelector(
        "div[class*='w-12'][class*='h-12']",
      );
      expect(iconContainer).toBeTruthy();

      // Icon should be visible
      expect(iconContainer).toBeVisible();
    });
  });

  it("should have tools count badge", () => {
    render(<AstuccioView />);
    const headers = screen.getAllByRole("heading", { level: 2 });

    headers.forEach((header) => {
      let container = header.parentElement;
      while (container && !container.className.includes("border")) {
        container = container.parentElement;
      }
      expect(container).toBeTruthy();

      // Should have a badge with tool count
      const badge = container?.querySelector("span");
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toBeTruthy();
    });
  });

  it("should have responsive flex layout with flex-col on mobile", () => {
    render(<AstuccioView />);
    const allHeaders = screen.getAllByRole("heading", { level: 2 });

    // Filter to only category headers (parent must have flex-1 class)
    const headers = allHeaders.filter((h) => {
      const parent = h.parentElement;
      return parent?.className.includes("flex-1") ?? false;
    });

    expect(headers.length).toBeGreaterThan(0);

    headers.forEach((header) => {
      // Navigate up: h2 -> title div (flex-1) -> header container (flex flex-col sm:flex-row...)
      const titleContainer = header.parentElement;
      const headerContainer = titleContainer?.parentElement;

      expect(headerContainer).toBeTruthy();
      const classList = headerContainer?.className || "";

      // Should have flex-col for mobile stacking
      expect(classList).toContain("flex-col");
      // Should have sm:flex-row for desktop side-by-side
      expect(classList).toContain("sm:flex-row");
    });
  });

  it("should have responsive item alignment", () => {
    render(<AstuccioView />);
    const allHeaders = screen.getAllByRole("heading", { level: 2 });

    // Filter to only category headers (parent must have flex-1 class)
    const headers = allHeaders.filter((h) => {
      const parent = h.parentElement;
      return parent?.className.includes("flex-1") ?? false;
    });

    headers.forEach((header) => {
      // Navigate up: h2 -> title div (flex-1) -> header container
      const titleContainer = header.parentElement;
      const headerContainer = titleContainer?.parentElement;
      const classList = headerContainer?.className || "";

      // Mobile alignment (items-start)
      expect(classList).toContain("items-start");
      // Desktop alignment (sm:items-center)
      expect(classList).toContain("sm:items-center");
    });
  });

  it("should have proper gap spacing", () => {
    render(<AstuccioView />);
    const allHeaders = screen.getAllByRole("heading", { level: 2 });

    // Filter to only category headers (parent must have flex-1 class)
    const headers = allHeaders.filter((h) => {
      const parent = h.parentElement;
      return parent?.className.includes("flex-1") ?? false;
    });

    headers.forEach((header) => {
      // Navigate up: h2 -> title div (flex-1) -> header container
      const titleContainer = header.parentElement;
      const headerContainer = titleContainer?.parentElement;
      const classList = headerContainer?.className || "";

      // Should have gap spacing
      expect(classList).toMatch(/gap-[0-9]/);
    });
  });

  it("should have padding for touch targets", () => {
    render(<AstuccioView />);
    const allHeaders = screen.getAllByRole("heading", { level: 2 });

    // Filter to only category headers (parent must have flex-1 class)
    const headers = allHeaders.filter((h) => {
      const parent = h.parentElement;
      return parent?.className.includes("flex-1") ?? false;
    });

    headers.forEach((header) => {
      // Navigate up: h2 -> title div (flex-1) -> header container
      const titleContainer = header.parentElement;
      const headerContainer = titleContainer?.parentElement;
      const classList = headerContainer?.className || "";

      // p-4 = 16px padding, sufficient for touch targets
      expect(classList).toContain("p-4");
    });
  });

  it("should have icon with flex-shrink-0 to prevent shrinking", () => {
    render(<AstuccioView />);
    const headers = screen.getAllByRole("heading", { level: 2 });

    headers.forEach((header) => {
      // Navigate up: h2 -> title div (flex-1) -> header container
      const titleContainer = header.parentElement;
      const headerContainer = titleContainer?.parentElement;

      // Icon is first child of header container
      const iconContainer = headerContainer?.querySelector(
        "div[class*='w-12'][class*='h-12']",
      );
      const classList = iconContainer?.className || "";

      // Icon should not shrink on mobile
      expect(classList).toContain("flex-shrink-0");
    });
  });

  it("should have title container with flex-1 for responsive sizing", () => {
    render(<AstuccioView />);
    const allHeaders = screen.getAllByRole("heading", { level: 2 });

    // Filter to only category headers (parent must have flex-1 class)
    const headers = allHeaders.filter((h) => {
      const parent = h.parentElement;
      return parent?.className.includes("flex-1") ?? false;
    });

    headers.forEach((header) => {
      // Direct parent of h2 is the title container with flex-1
      const titleContainer = header.parentElement;
      const classList = titleContainer?.className || "";

      // Title container should take up available space
      expect(classList).toContain("flex-1");
    });
  });

  it("should have ml-auto badge positioning", () => {
    render(<AstuccioView />);
    const headers = screen.getAllByRole("heading", { level: 2 });

    headers.forEach((header) => {
      // Navigate up: h2 -> title div (flex-1) -> header container
      const titleContainer = header.parentElement;
      const headerContainer = titleContainer?.parentElement;

      // Badge container is a child of header container with ml-auto
      const badgeContainer = headerContainer?.querySelector(
        "div[class*='ml-auto']",
      );

      expect(badgeContainer).toBeTruthy();
    });
  });

  it("should maintain border and rounded styling", () => {
    render(<AstuccioView />);
    const headers = screen.getAllByRole("heading", { level: 2 });

    headers.forEach((header) => {
      const container = header.closest("div[class*='border']");
      const classList = container?.className || "";

      // Visual styling
      expect(classList).toContain("border");
      expect(classList).toContain("rounded");
    });
  });

  it("should render category titles with subtitles", () => {
    render(<AstuccioView />);
    const headers = screen.getAllByRole("heading", { level: 2 });

    headers.forEach((header) => {
      const titleContainer = header.parentElement;
      const subtitle = titleContainer?.querySelector("p");

      expect(subtitle).toBeTruthy();
      expect(subtitle).toBeVisible();
    });
  });
});
