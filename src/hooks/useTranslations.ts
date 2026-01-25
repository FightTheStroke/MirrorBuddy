/**
 * Type-safe translation hook wrapper for next-intl
 *
 * This hook provides a type-safe interface to access translations with:
 * - Namespace support (e.g., 'common', 'auth', 'errors')
 * - Fallback handling for missing translations (via next-intl)
 * - Variable interpolation support
 * - Full TypeScript type checking
 *
 * @example
 * ```tsx
 * // Basic usage with namespace
 * const t = useTranslations('common');
 * t('save'); // "Save"
 *
 * // With variables
 * const t = useTranslations('validation');
 * t('minLength', { min: 8 }); // "Must be at least 8 characters"
 *
 * // Nested keys
 * const t = useTranslations('navigation');
 * t('breadcrumbs.home'); // "Home"
 * ```
 */

import { useTranslations as useNextIntlTranslations } from "next-intl";
import type { TranslationVariables } from "@/i18n/types";

/**
 * Re-export next-intl's useTranslations hook
 *
 * This provides type-safe access to translations with namespace support.
 * The hook is strongly typed based on your message structure.
 *
 * @param namespace - The translation namespace to use (e.g., 'common', 'auth')
 * @returns A typed function to retrieve translations from the specified namespace
 */
export { useTranslations } from "next-intl";

/**
 * Helper function to format messages with variables outside of React components
 *
 * This is useful for formatting messages in utility functions, API calls, etc.
 * For React components, use the `useTranslations` hook instead.
 *
 * @param message - The message template (e.g., "Hello {name}")
 * @param variables - Object containing variable values
 * @returns Formatted message string
 *
 * @example
 * ```tsx
 * formatMessage("Must be at least {min} characters", { min: 8 });
 * // Returns: "Must be at least 8 characters"
 * ```
 */
export function formatMessage(
  message: string,
  variables?: TranslationVariables
): string {
  if (!variables) return message;

  let formatted = message;
  for (const [key, value] of Object.entries(variables)) {
    formatted = formatted.replace(new RegExp(`{${key}}`, "g"), String(value));
  }
  return formatted;
}

/**
 * Hook for accessing translations without a specific namespace
 * Useful when you need to access multiple namespaces in one component
 *
 * @returns The translation function from next-intl (supports all namespaces)
 *
 * @example
 * ```tsx
 * const t = useTranslationsGlobal();
 * t('common.save');      // "Save"
 * t('auth.login');       // "Login"
 * t('errors.notFound');  // "Not found"
 * ```
 */
export function useTranslationsGlobal() {
  // Use root namespace to access all translations
  return useNextIntlTranslations();
}

/**
 * Type-safe wrapper for common translations
 * Provides quick access to frequently used common translations
 *
 * @returns Object with common translation functions
 *
 * @example
 * ```tsx
 * const { save, cancel, loading } = useCommonTranslations();
 * <button>{save}</button>
 * <button>{cancel}</button>
 * <span>{loading}</span>
 * ```
 */
export function useCommonTranslations() {
  const t = useNextIntlTranslations("common");

  return {
    loading: t("loading"),
    error: t("error"),
    success: t("success"),
    warning: t("warning"),
    info: t("info"),
    confirm: t("confirm"),
    cancel: t("cancel"),
    save: t("save"),
    delete: t("delete"),
    edit: t("edit"),
    add: t("add"),
    remove: t("remove"),
    search: t("search"),
    filter: t("filter"),
    sort: t("sort"),
    refresh: t("refresh"),
    close: t("close"),
    back: t("back"),
    next: t("next"),
    previous: t("previous"),
    submit: t("submit"),
    reset: t("reset"),
    clear: t("clear"),
    select: t("select"),
    yes: t("yes"),
    no: t("no"),
    ok: t("ok"),
  };
}
