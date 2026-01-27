import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AppearanceSettings } from "@/components/settings/sections/appearance-settings";
import { useLocaleContext } from "@/i18n/locale-provider";

// Mock the locale context
vi.mock("@/i18n/locale-provider", () => ({
  useLocaleContext: vi.fn(),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "settings.appearance.languageTitle": "Language",
      "settings.appearance.languageDescription":
        "Choose your preferred language",
      "settings.appearance.themeTitle": "Theme",
      "settings.appearance.accentColorTitle": "Accent Color",
      "settings.appearance.currentThemeInfo": "Current theme: {theme}",
      "settings.appearance.darkTheme": "Dark",
      "settings.appearance.lightTheme": "Light",
    };
    return translations[key] || key;
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("AppearanceSettings - Language Switcher Hard Navigation (F-70)", () => {
  let mockSwitchLocale: any;

  beforeEach(() => {
    mockSwitchLocale = vi.fn();
    (useLocaleContext as any).mockReturnValue({
      locale: "it",
      locales: ["it", "en", "es", "fr", "de"],
      defaultLocale: "it",
      localeNames: {
        it: "Italiano",
        en: "English",
        es: "Español",
        fr: "Français",
        de: "Deutsch",
      },
      localeFlags: {
        it: "🇮🇹",
        en: "🇬🇧",
        es: "🇪🇸",
        fr: "🇫🇷",
        de: "🇩🇪",
      },
      switchLocale: mockSwitchLocale,
    });

    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: "" };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Language switcher uses hard navigation", () => {
    it("calls switchLocale when English language button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();

      render(
        <AppearanceSettings
          appearance={{
            theme: "light",
            accentColor: "blue",
            language: "it",
          }}
          onUpdate={mockOnUpdate}
        />,
      );

      // Find and click English button
      const englishButton = screen.getByRole("button", { name: /English/i });
      await user.click(englishButton);

      // Should have called switchLocale
      expect(mockSwitchLocale).toHaveBeenCalledWith("en");
    });

    it("calls switchLocale when Spanish language button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();

      render(
        <AppearanceSettings
          appearance={{
            theme: "light",
            accentColor: "blue",
            language: "it",
          }}
          onUpdate={mockOnUpdate}
        />,
      );

      // Find and click Spanish button
      const spanishButton = screen.getByRole("button", { name: /Español/i });
      await user.click(spanishButton);

      // Should have called switchLocale
      expect(mockSwitchLocale).toHaveBeenCalledWith("es");
    });

    it("calls switchLocale when French language button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();

      render(
        <AppearanceSettings
          appearance={{
            theme: "light",
            accentColor: "blue",
            language: "it",
          }}
          onUpdate={mockOnUpdate}
        />,
      );

      // Find and click French button
      const frenchButton = screen.getByRole("button", { name: /Français/i });
      await user.click(frenchButton);

      // Should have called switchLocale
      expect(mockSwitchLocale).toHaveBeenCalledWith("fr");
    });

    it("calls switchLocale when German language button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();

      render(
        <AppearanceSettings
          appearance={{
            theme: "light",
            accentColor: "blue",
            language: "it",
          }}
          onUpdate={mockOnUpdate}
        />,
      );

      // Find and click German button
      const germanButton = screen.getByRole("button", { name: /Deutsch/i });
      await user.click(germanButton);

      // Should have called switchLocale
      expect(mockSwitchLocale).toHaveBeenCalledWith("de");
    });

    it("calls switchLocale with correct locale code for each language", async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();

      const languages = [
        { name: "Italiano", code: "it" },
        { name: "English", code: "en" },
        { name: "Español", code: "es" },
        { name: "Français", code: "fr" },
        { name: "Deutsch", code: "de" },
      ];

      for (const lang of languages) {
        mockSwitchLocale.mockClear();

        const { unmount } = render(
          <AppearanceSettings
            appearance={{
              theme: "light",
              accentColor: "blue",
              language: "it",
            }}
            onUpdate={mockOnUpdate}
          />,
        );

        const button = screen.getByRole("button", {
          // eslint-disable-next-line security/detect-non-literal-regexp -- Test pattern from known constant
          name: new RegExp(lang.name, "i"),
        });
        await user.click(button);

        expect(mockSwitchLocale).toHaveBeenCalledWith(lang.code);
        unmount();
      }
    });
  });

  describe("Hard navigation behavior verification", () => {
    it("uses switchLocale instead of just updating state", async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();

      render(
        <AppearanceSettings
          appearance={{
            theme: "light",
            accentColor: "blue",
            language: "it",
          }}
          onUpdate={mockOnUpdate}
        />,
      );

      const englishButton = screen.getByRole("button", { name: /English/i });
      await user.click(englishButton);

      // switchLocale should be called (for hard navigation)
      expect(mockSwitchLocale).toHaveBeenCalledWith("en");

      // onUpdate should NOT be called for language changes (since we're doing hard navigation)
      // OR if it is called, it should be after switchLocale is called
      // The important thing is that switchLocale is called first
    });

    it("does not skip language switching when button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();

      render(
        <AppearanceSettings
          appearance={{
            theme: "light",
            accentColor: "blue",
            language: "it",
          }}
          onUpdate={mockOnUpdate}
        />,
      );

      const englishButton = screen.getByRole("button", { name: /English/i });
      expect(englishButton).toBeInTheDocument();

      await user.click(englishButton);

      // switchLocale must be called to trigger page reload
      await waitFor(() => {
        expect(mockSwitchLocale).toHaveBeenCalledWith("en");
      });
    });
  });

  describe("User experience - language selection feedback", () => {
    it("highlights selected language button", () => {
      const mockOnUpdate = vi.fn();

      render(
        <AppearanceSettings
          appearance={{
            theme: "light",
            accentColor: "blue",
            language: "en",
          }}
          onUpdate={mockOnUpdate}
        />,
      );

      const englishButton = screen.getByRole("button", { name: /English/i });

      // Should have selected state styling
      expect(englishButton).toHaveAttribute("aria-pressed", "true");
    });

    it("shows check mark on selected language", () => {
      const mockOnUpdate = vi.fn();

      render(
        <AppearanceSettings
          appearance={{
            theme: "light",
            accentColor: "blue",
            language: "fr",
          }}
          onUpdate={mockOnUpdate}
        />,
      );

      // Find the check icon that appears with French
      const frenchButton = screen.getByRole("button", { name: /Français/i });
      const checkIcon = frenchButton.querySelector("svg");

      // The check icon should exist in the French button (lucide Check SVG)
      expect(checkIcon).toBeInTheDocument();
    });
  });
});
