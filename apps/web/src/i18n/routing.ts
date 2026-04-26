// Locale routing configuration for next-intl
// This file configures routing behavior for internationalized URLs

import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale } from "./config";

export const routing = defineRouting({
  // All supported locales
  locales,

  // Default locale when no locale is specified
  defaultLocale,

  // Prefix strategy for locale in URL
  // - 'always': Always include locale prefix (e.g., /en/dashboard, /it/dashboard)
  // - 'as-needed': Only show prefix for non-default locales
  localePrefix: "always",
});

// Type exports for routing utilities
export type Pathnames = never;
export type Locale = (typeof routing.locales)[number];
