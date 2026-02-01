/**
 * Unit tests for BottomNav component
 * TDD Phase: RED - Failing tests for F-10 requirements
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "../bottom-nav";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

describe("BottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Structure and Visibility", () => {
    it("renders navigation with all 5 items", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      // All 5 navigation items should be present (structure-based assertion)
      const links = container.querySelectorAll("a");
      expect(links.length).toBe(5);

      // Verify expected hrefs are present (i18n-agnostic)
      const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
      expect(hrefs).toContain("/");
      expect(hrefs).toContain("/chat");
      expect(hrefs).toContain("/astuccio");
      expect(hrefs).toContain("/settings");
      expect(hrefs).toContain("/profile");
    });

    it("renders as navigation landmark", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      render(<BottomNav />);

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });

    it("has sm:hidden class for desktop hiding", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const nav = container.querySelector("nav");
      expect(nav?.className).toMatch(/sm:hidden/);
    });

    it("has fixed positioning at bottom", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const nav = container.querySelector("nav");
      expect(nav?.className).toMatch(/fixed/);
      expect(nav?.className).toMatch(/bottom-0/);
    });

    it("has safe area padding for iOS", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const nav = container.querySelector("nav");
      expect(nav?.className).toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
    });
  });

  describe("Navigation Items", () => {
    it("renders correct hrefs for each item", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      // Use href-based assertions (i18n-agnostic)
      const links = container.querySelectorAll("a");
      const linkMap = new Map(
        Array.from(links).map((a) => [a.getAttribute("href"), a]),
      );

      expect(linkMap.get("/")).toBeTruthy();
      expect(linkMap.get("/chat")).toBeTruthy();
      expect(linkMap.get("/astuccio")).toBeTruthy();
      expect(linkMap.get("/settings")).toBeTruthy();
      expect(linkMap.get("/profile")).toBeTruthy();
    });

    it("renders correct icons for each item", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      // Each link should have an SVG icon (lucide-react renders as SVG)
      const links = container.querySelectorAll("a");
      expect(links.length).toBe(5);
      links.forEach((link) => {
        const svg = link.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("Active State", () => {
    it("marks home as active when on home page", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      // Find link by href (i18n-agnostic)
      const homeLink = container.querySelector('a[href="/"]');
      expect(homeLink?.className).toMatch(/text-primary/);
    });

    it("marks chat as active when on chat page", () => {
      vi.mocked(usePathname).mockReturnValue("/chat");
      const { container } = render(<BottomNav />);

      const chatLink = container.querySelector('a[href="/chat"]');
      expect(chatLink?.className).toMatch(/text-primary/);
    });

    it("marks tools as active when on astuccio page", () => {
      vi.mocked(usePathname).mockReturnValue("/astuccio");
      const { container } = render(<BottomNav />);

      const toolsLink = container.querySelector('a[href="/astuccio"]');
      expect(toolsLink?.className).toMatch(/text-primary/);
    });

    it("marks settings as active when on settings subpage", () => {
      vi.mocked(usePathname).mockReturnValue("/settings/profile");
      const { container } = render(<BottomNav />);

      const settingsLink = container.querySelector('a[href="/settings"]');
      expect(settingsLink?.className).toMatch(/text-primary/);
    });

    it("marks non-active items with muted color", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const chatLink = container.querySelector('a[href="/chat"]');
      expect(chatLink?.className).toMatch(/text-muted-foreground/);
    });
  });

  describe("Touch Targets (Accessibility)", () => {
    it("has minimum 44px touch targets", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const links = container.querySelectorAll("a");
      links.forEach((link) => {
        expect(link.className).toMatch(/min-w-\[44px\]/);
        expect(link.className).toMatch(/min-h-\[44px\]/);
      });
    });

    it("has flex layout for centering", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const links = container.querySelectorAll("a");
      links.forEach((link) => {
        expect(link.className).toMatch(/flex/);
        expect(link.className).toMatch(/flex-col/);
        expect(link.className).toMatch(/items-center/);
        expect(link.className).toMatch(/justify-center/);
      });
    });
  });

  describe("Styling", () => {
    it("has high z-index for stacking", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const nav = container.querySelector("nav");
      expect(nav?.className).toMatch(/z-50/);
    });

    it("has border-top for separation", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const nav = container.querySelector("nav");
      expect(nav?.className).toMatch(/border-t/);
    });

    it("supports dark mode", () => {
      vi.mocked(usePathname).mockReturnValue("/");
      const { container } = render(<BottomNav />);

      const nav = container.querySelector("nav");
      expect(nav?.className).toMatch(/dark:bg-slate-900/);
    });
  });
});
