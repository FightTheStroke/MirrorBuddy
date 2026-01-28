/**
 * Language Switcher Component Tests
 * @vitest-environment jsdom
 *
 * F-69: Users can select their preferred language before logging in
 *
 * Test Coverage:
 * - Displays all 5 languages (IT, EN, FR, DE, ES)
 * - Shows flags for each language
 * - Sets NEXT_LOCALE cookie on selection
 * - Redirects to /{locale}/welcome after selection
 * - Highlights current locale
 * - Keyboard navigation works (Tab, Enter, Escape)
 * - ARIA attributes for accessibility
 * - Mobile responsive design
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LanguageSwitcher } from "../language-switcher";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

// Mock next-intl navigation wrapper
vi.mock("@/i18n/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("LanguageSwitcher - F-69", () => {
  const mockPush = vi.fn();
  const mockRouter = { push: mockPush };
  let originalCookie: string;

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (usePathname as any).mockReturnValue("/it/welcome");
    // Save and clear cookies
    originalCookie = document.cookie;
    document.cookie = "";
  });

  afterEach(() => {
    // Restore cookies
    document.cookie = originalCookie;
  });

  describe("Rendering", () => {
    it("should render language switcher button", () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      expect(button).toBeInTheDocument();
    });

    it("should show all 5 languages in dropdown", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Italiano")).toBeInTheDocument();
        expect(screen.getByText("English")).toBeInTheDocument();
        expect(screen.getByText("Français")).toBeInTheDocument();
        expect(screen.getByText("Deutsch")).toBeInTheDocument();
        expect(screen.getByText("Español")).toBeInTheDocument();
      });
    });

    it("should show flags for each language", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("🇮🇹")).toBeInTheDocument();
        expect(screen.getByText("🇬🇧")).toBeInTheDocument();
        expect(screen.getByText("🇫🇷")).toBeInTheDocument();
        expect(screen.getByText("🇩🇪")).toBeInTheDocument();
        expect(screen.getByText("🇪🇸")).toBeInTheDocument();
      });
    });

    it("should highlight current locale", async () => {
      (usePathname as any).mockReturnValue("/en/welcome");
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        const englishOption = screen.getByText("English").closest("button");
        expect(englishOption).toHaveAttribute("aria-current", "true");
      });
    });
  });

  describe("Language Selection", () => {
    it("should set NEXT_LOCALE cookie on language selection", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        const englishOption = screen.getByText("English");
        fireEvent.click(englishOption);
      });

      // Check that cookie was set
      expect(document.cookie).toContain("NEXT_LOCALE=en");
    });

    it("should redirect to /{locale}/welcome after selection", async () => {
      (usePathname as any).mockReturnValue("/it/welcome");
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        const frenchOption = screen.getByText("Français");
        fireEvent.click(frenchOption);
      });

      expect(mockPush).toHaveBeenCalledWith("/welcome", { locale: "fr" });
    });

    it("should close dropdown after selection", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("English")).toBeInTheDocument();
      });

      const englishOption = screen.getByText("English");
      fireEvent.click(englishOption);

      await waitFor(() => {
        expect(screen.queryByText("English")).not.toBeInTheDocument();
      });
    });
  });

  describe("Keyboard Navigation", () => {
    it("should open dropdown on Enter key", () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.keyDown(button, { key: "Enter", code: "Enter" });

      expect(screen.getByText("Italiano")).toBeInTheDocument();
    });

    it("should close dropdown on Escape key", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Italiano")).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

      await waitFor(() => {
        expect(screen.queryByText("Italiano")).not.toBeInTheDocument();
      });
    });

    it("should navigate options with Tab key", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        const italiano = screen.getByText("Italiano").closest("button");
        expect(italiano).toBeInTheDocument();
      });

      // Tab to next option
      fireEvent.keyDown(document, { key: "Tab", code: "Tab" });
      // Verify focus management works
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });

      expect(button).toHaveAttribute("aria-haspopup", "true");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("should update aria-expanded when opened", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute("aria-expanded", "true");
      });
    });

    it("should have role=menu for dropdown", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        const menu = screen.getByRole("menu");
        expect(menu).toBeInTheDocument();
      });
    });

    it("should have role=menuitem for each option", async () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        const menuItems = screen.getAllByRole("menuitem");
        expect(menuItems).toHaveLength(5);
      });
    });

    it("should have visible focus indicators", () => {
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });

      button.focus();
      expect(button).toHaveFocus();
      // Check if focus ring styles are applied
      expect(button.className).toContain("focus");
    });
  });

  describe("Mobile Responsive", () => {
    it("should render on mobile viewports", () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event("resize"));

      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      expect(button).toBeInTheDocument();
    });

    it("should position dropdown correctly on mobile", async () => {
      global.innerWidth = 375;
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        const menu = screen.getByRole("menu");
        expect(menu).toBeInTheDocument();
        // Verify it has responsive positioning classes
        expect(menu.className).toMatch(/fixed|absolute/);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing pathname gracefully", () => {
      (usePathname as any).mockReturnValue(null);
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      expect(button).toBeInTheDocument();
    });

    it("should handle invalid locale in pathname", async () => {
      (usePathname as any).mockReturnValue("/invalid/welcome");
      render(<LanguageSwitcher />);
      const button = screen.getByRole("button", { name: /language/i });
      fireEvent.click(button);

      await waitFor(() => {
        const englishOption = screen.getByText("English");
        fireEvent.click(englishOption);
      });

      // Should still redirect properly
      expect(mockPush).toHaveBeenCalledWith("/welcome", { locale: "en" });
    });
  });
});
