"use client";

import { createContext, useContext, useMemo } from "react";
import { NextIntlClientProvider } from "next-intl";
import { locales, defaultLocale, localeNames, localeFlags } from "./config";
import type { Locale } from "./config";

interface LocaleContextValue {
  locale: Locale;
  locales: readonly Locale[];
  defaultLocale: Locale;
  localeNames: Record<Locale, string>;
  localeFlags: Record<Locale, string>;
  switchLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

interface LocaleProviderProps {
  children: React.ReactNode;
  messages: Record<string, unknown>;
  locale: string;
}

/**
 * LocaleProvider - Wraps NextIntlClientProvider and provides locale context
 *
 * This provider:
 * - Wraps NextIntlClientProvider for message translations
 * - Provides current locale and available locales via context
 * - Exposes locale switching capability
 * - Makes locale information accessible to all components
 *
 * Usage:
 * ```tsx
 * import { LocaleProvider } from "@/i18n/locale-provider";
 *
 * <LocaleProvider locale={locale} messages={messages}>
 *   {children}
 * </LocaleProvider>
 * ```
 */
export function LocaleProvider({
  children,
  messages,
  locale,
}: LocaleProviderProps) {
  const contextValue = useMemo<LocaleContextValue>(
    () => ({
      locale: locale as Locale,
      locales,
      defaultLocale,
      localeNames,
      localeFlags,
      switchLocale: (newLocale: Locale) => {
        // Get current path without locale prefix
        const currentPath = window.location.pathname;
        const pathWithoutLocale = currentPath.replace(
          new RegExp(`^/(${locales.join("|")})`),
          "",
        );

        // Navigate to new locale path
        const newPath = `/${newLocale}${pathWithoutLocale || ""}`;
        window.location.href = newPath;
      },
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access locale context
 *
 * @throws Error if used outside LocaleProvider
 *
 * @returns Locale context with current locale, available locales, and switching function
 *
 * @example
 * ```tsx
 * const { locale, locales, switchLocale } = useLocaleContext();
 * ```
 */
export function useLocaleContext() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocaleContext must be used within LocaleProvider");
  }

  return context;
}
