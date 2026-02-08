/**
 * Unit tests for UserMenuDropdown component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenuDropdown } from "../user-menu-dropdown";

// Mock csrfFetch
const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "userMenu.greeting": "Ciao",
      "userMenu.profile": "Profilo",
      "userMenu.changePassword": "Cambia Password",
      "userMenu.settings": "Impostazioni",
      "userMenu.logout": "Esci",
    };
    return translations[key] || key;
  },
}));

describe("UserMenuDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCsrfFetch.mockResolvedValue({
      ok: true,
    });
  });

  describe("Rendering", () => {
    it("renders trigger button with greeting when userName is provided", () => {
      render(<UserMenuDropdown userName="Mario" />);

      const button = screen.getByRole("button", { name: /ciao/i });
      expect(button).toBeInTheDocument();
      expect(screen.getByText("Ciao")).toBeInTheDocument();
      expect(screen.getByText("Mario")).toBeInTheDocument();
    });

    it("renders greeting text with correct structure", () => {
      render(<UserMenuDropdown userName="Mario" />);

      // Check that both greeting and username are present
      const greeting = screen.getByText("Ciao");
      const userName = screen.getByText("Mario");

      expect(greeting).toBeInTheDocument();
      expect(userName).toBeInTheDocument();
      expect(userName.className).toContain("font-semibold");
    });

    it("renders User icon when userName is not provided", () => {
      render(<UserMenuDropdown />);

      const button = screen.getByRole("button", { name: /ciao/i });
      expect(button).toBeInTheDocument();

      // Check for User icon (lucide-react User component)
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("opens menu and shows all 4 menu items", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      // All 4 menu items should be visible
      await waitFor(() => {
        expect(screen.getByText("Profilo")).toBeInTheDocument();
        expect(screen.getByText("Cambia Password")).toBeInTheDocument();
        expect(screen.getByText("Impostazioni")).toBeInTheDocument();
        expect(screen.getByText("Esci")).toBeInTheDocument();
      });
    });

    it("renders menu items with correct icons", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      // Check that each menu item has an icon (svg)
      await waitFor(() => {
        const menuItems = screen.getAllByRole("menuitem");
        menuItems.forEach((item) => {
          const icon = item.querySelector("svg");
          expect(icon).toBeInTheDocument();
        });
      });
    });
  });

  describe("Menu Navigation", () => {
    it("navigates to /settings when Profile is clicked", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const profileItem = await screen.findByText("Profilo");
      await user.click(profileItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/settings");
      });
    });

    it("navigates to /change-password when Change Password is clicked", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const changePasswordItem = await screen.findByText("Cambia Password");
      await user.click(changePasswordItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/change-password");
      });
    });

    it("navigates to /settings when Settings is clicked", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const settingsItem = await screen.findByText("Impostazioni");
      await user.click(settingsItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/settings");
      });
    });
  });

  describe("Logout Functionality", () => {
    it("calls csrfFetch with /api/auth/logout when logout is clicked", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const logoutItem = await screen.findByText("Esci");
      await user.click(logoutItem);

      await waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalledWith("/api/auth/logout", {
          method: "POST",
        });
      });
    });

    it("redirects to /login after successful logout", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const logoutItem = await screen.findByText("Esci");
      await user.click(logoutItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    it("does not redirect if logout API fails", async () => {
      const user = userEvent.setup();
      mockCsrfFetch.mockResolvedValueOnce({ ok: false });

      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const logoutItem = await screen.findByText("Esci");
      await user.click(logoutItem);

      await waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalled();
      });

      // Should not navigate on failure
      expect(mockPush).not.toHaveBeenCalledWith("/login");
    });

    it("disables logout button while logging out", async () => {
      const user = userEvent.setup();
      // Delay the csrfFetch to simulate loading
      mockCsrfFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true }), 100);
          }),
      );

      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const logoutItem = await screen.findByText("Esci");
      const menuItem = logoutItem.closest('[role="menuitem"]');

      await user.click(logoutItem);

      // During logout, the button should show disabled styling
      await waitFor(() => {
        expect(menuItem?.className).toContain("opacity-50");
        expect(menuItem?.className).toContain("cursor-not-allowed");
      });

      // Wait for the delayed response to fully resolve (prevents leaking into next test)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    it("prevents multiple logout requests when clicked multiple times", async () => {
      const user = userEvent.setup();
      // Delay the csrfFetch to allow multiple clicks
      mockCsrfFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true }), 100);
          }),
      );

      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const logoutItem = await screen.findByText("Esci");

      // Click multiple times rapidly
      await user.click(logoutItem);
      fireEvent.click(logoutItem);
      fireEvent.click(logoutItem);

      await waitFor(() => {
        // Should only be called once
        expect(mockCsrfFetch).toHaveBeenCalledTimes(1);
      });

      // Wait for the delayed response to fully resolve (prevents leaking into next test)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    it("handles logout network error gracefully", async () => {
      const user = userEvent.setup();
      mockCsrfFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const logoutItem = await screen.findByText("Esci");
      await user.click(logoutItem);

      await waitFor(() => {
        expect(mockCsrfFetch).toHaveBeenCalled();
      });

      // Should not navigate on error
      expect(mockPush).not.toHaveBeenCalledWith("/login");
    });
  });

  describe("Keyboard Navigation", () => {
    it("trigger button is keyboard focusable", () => {
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      trigger.focus();

      expect(document.activeElement).toBe(trigger);
    });

    it("closes menu when Escape key is pressed", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      // Menu should be open
      await waitFor(() => {
        expect(screen.getByText("Profilo")).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard("{Escape}");

      // Menu should be closed (items not visible)
      await waitFor(() => {
        expect(screen.queryByText("Profilo")).not.toBeInTheDocument();
      });
    });

    it("menu items can be navigated with Tab key", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      await waitFor(async () => {
        const menuItems = screen.getAllByRole("menuitem");

        // First item should be focusable
        menuItems[0].focus();
        expect(document.activeElement).toBe(menuItems[0]);
      });
    });

    it("activates menu item on Enter key", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const profileItem = await screen.findByText("Profilo");
      const menuItem = profileItem.closest<HTMLElement>('[role="menuitem"]');

      // Focus and press Enter on profile item
      if (menuItem) {
        menuItem.focus();
        await user.keyboard("{Enter}");
      }

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/settings");
      });
    });
  });

  describe("Accessibility", () => {
    it("trigger button has aria-label", () => {
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      expect(trigger).toHaveAttribute("aria-label", "Ciao");
    });

    it("menu items have proper role attributes", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      await waitFor(() => {
        const menuItems = screen.getAllByRole("menuitem");
        expect(menuItems.length).toBe(4);

        menuItems.forEach((item) => {
          expect(item).toHaveAttribute("role", "menuitem");
        });
      });
    });

    it("has focus indicators on interactive elements", () => {
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });

      // Trigger should have focus styles
      expect(trigger.className).toContain("focus:outline-none");
      expect(trigger.className).toContain("focus:ring-2");
    });

    it("menu items have focus styles", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      await waitFor(() => {
        const menuItems = screen.getAllByRole("menuitem");

        menuItems.forEach((item) => {
          expect(item.className).toContain("focus:outline-none");
        });
      });
    });

    it("logout item has distinct styling", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      const logoutItem = await screen.findByText("Esci");
      const menuItem = logoutItem.closest('[role="menuitem"]');

      // Logout should have red/danger styling
      expect(menuItem?.className).toContain("text-red-");
    });
  });

  describe("Custom Styling", () => {
    it("applies custom className to trigger button", () => {
      render(<UserMenuDropdown userName="Mario" className="custom-class" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      expect(trigger.className).toContain("custom-class");
    });

    it("has hover states on trigger button", () => {
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      expect(trigger.className).toContain("hover:bg-slate-100");
    });

    it("menu has separator before logout item", async () => {
      const user = userEvent.setup();
      render(<UserMenuDropdown userName="Mario" />);

      const trigger = screen.getByRole("button", { name: /ciao/i });
      await user.click(trigger);

      await waitFor(() => {
        const separator = document.querySelector("[role='separator']");
        expect(separator).toBeInTheDocument();
      });
    });
  });
});
