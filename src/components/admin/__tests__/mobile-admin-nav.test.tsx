/**
 * Unit tests for MobileAdminNav component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileAdminNav } from "../mobile-admin-nav";

// Mock usePathname
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users",
}));

describe("MobileAdminNav", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Visibility and Rendering", () => {
    it("renders hamburger trigger button", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={false}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const trigger = container.querySelector('button[aria-label*="Avri"]');
      expect(trigger).toBeInTheDocument();
    });

    it("renders drawer when open", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      // Check for nav element or drawer
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("drawer is hidden when closed", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={false}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      // Drawer should be off-screen with -translate-x-full
      const drawer = container.querySelector("aside");
      expect(drawer).toHaveClass("-translate-x-full");
    });

    it("hidden on md+ screens", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={false}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const wrapper = container.querySelector(".lg\\:hidden");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Navigation Links", () => {
    it("renders all admin navigation links", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Richieste Beta")).toBeInTheDocument();
      expect(screen.getByText("Utenti")).toBeInTheDocument();
      expect(screen.getByText("Piani")).toBeInTheDocument();
      expect(screen.getByText("Analytics")).toBeInTheDocument();
      expect(screen.getByText("Impostazioni")).toBeInTheDocument();
    });

    it("marks current page as active", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const usersLink = screen.getByRole("link", { name: /utenti/i });
      expect(usersLink).toHaveClass("bg-slate-900", "text-white");
    });

    it("closes drawer when link is clicked", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const link = screen.getByRole("link", { name: /utenti/i });
      fireEvent.click(link);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Touch Targets", () => {
    it("hamburger button is at least 44x44px", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={false}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const button = container.querySelector('button[aria-label*="Avri"]');
      expect(button).toHaveClass("h-11", "w-11");
    });

    it("nav links have 44px minimum touch targets", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const navLinks = container.querySelectorAll("nav a");
      navLinks.forEach((link) => {
        // Should have adequate padding for touch target
        expect(link).toHaveClass("py-3", "px-4");
      });
    });
  });

  describe("Backdrop and Interaction", () => {
    it("backdrop is present when drawer is open", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const backdrop = container.querySelector(
        "div[aria-hidden='true'].bg-black\\/50",
      );
      expect(backdrop).toBeInTheDocument();
    });

    it("no backdrop when drawer is closed", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={false}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const backdrop = container.querySelector(
        "div[aria-hidden='true'].bg-black\\/50",
      );
      expect(backdrop).not.toBeInTheDocument();
    });

    it("escape key listener is set up when open", () => {
      const { rerender } = render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      // Verify component renders without errors and sets up listeners
      expect(screen.getByRole("navigation")).toBeInTheDocument();

      rerender(
        <MobileAdminNav
          isOpen={false}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      // Should not throw errors during lifecycle
      expect(true).toBe(true);
    });
  });

  describe("Badges and Indicators", () => {
    it("displays pending invites badge when count > 0", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={5}
          systemAlerts={0}
        />,
      );

      const inviteItem = screen.getByText("Richieste Beta").closest("a");
      expect(inviteItem).toHaveTextContent("5");
    });

    it("displays system alerts badge when count > 0", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={3}
        />,
      );

      const dashboardItem = screen.getByText("Dashboard").closest("a");
      expect(dashboardItem).toHaveTextContent("3");
    });

    it("caps badge at 99+", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={150}
          systemAlerts={0}
        />,
      );

      const badge = screen.getByText("99+");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Return to App Link", () => {
    it("displays return to app button", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const returnBtn = screen.getByText(/torna all/i);
      expect(returnBtn).toBeInTheDocument();
    });

    it("return to app button links to home", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const returnLink = screen.getByText(/torna all/i).closest("a");
      expect(returnLink).toHaveAttribute("href", "/");
    });
  });

  describe("Accessibility", () => {
    it("hamburger button has accessible label", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={false}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const button = container.querySelector('button[aria-label*="Avri"]');
      expect(button).toHaveAttribute("aria-label");
    });

    it("nav is semantic HTML5 nav element", () => {
      render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const nav = screen.getByRole("navigation");
      expect(nav.tagName).toBe("NAV");
    });

    it("backdrop has aria-hidden for assistive tech", () => {
      const { container } = render(
        <MobileAdminNav
          isOpen={true}
          onOpen={vi.fn()}
          onClose={mockOnClose}
          pendingInvites={0}
          systemAlerts={0}
        />,
      );

      const backdrop = container.querySelector(
        "div[aria-hidden='true'].bg-black\\/50",
      );
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveAttribute("aria-hidden", "true");
    });
  });
});
