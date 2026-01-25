// Central export file for i18n utilities
// This file provides a single import point for all i18n configuration and utilities

// Locale configuration
export { locales, defaultLocale, localeNames, localeFlags } from "./config";
export type { Locale } from "./config";

// Routing configuration
export { routing } from "./routing";
export type { Pathnames } from "./routing";

// Request utilities (for server-side i18n)
export { default as getRequestConfig } from "./request";

// Type-safe translation types
export type {
  MessageNamespace,
  MessageKey,
  Messages,
  TranslationVariables,
} from "./types";

// Locale provider and context
export { LocaleProvider, useLocaleContext } from "./locale-provider";

// Translation hooks (re-exported from hooks for convenience)
export {
  useTranslations,
  useTranslationsGlobal,
  useCommonTranslations,
  formatMessage,
} from "@/hooks/useTranslations";
