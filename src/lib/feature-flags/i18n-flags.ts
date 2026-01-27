/**
 * i18n Feature Flag Module
 *
 * F-63: i18n can be enabled/disabled per environment
 *
 * Simple environment variable-based flag for gradual i18n rollout.
 * Default: enabled (true) unless explicitly disabled via FEATURE_I18N_ENABLED=false
 *
 * Usage:
 * - Middleware: Check before applying locale routing
 * - Components: Check before showing language switcher
 * - API routes: Gate i18n-specific endpoints
 */

/**
 * Check if i18n feature is enabled.
 *
 * Parses FEATURE_I18N_ENABLED environment variable:
 * - Not set or "true", "1" → true (default)
 * - "false", "0", "no", "" → false
 * - Case-insensitive
 *
 * Returns: true if i18n is enabled
 */
export function isI18nEnabled(): boolean {
  const envValue = process.env.FEATURE_I18N_ENABLED;

  // Default to true if not set
  if (envValue === undefined) {
    return true;
  }

  // Parse string value
  const normalized = envValue.toLowerCase().trim();

  // Truthy values
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  // Falsy values
  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no" ||
    normalized === ""
  ) {
    return false;
  }

  // Default to false for unknown values (safe default)
  return false;
}

/**
 * Get the current i18n feature status as a string
 * Useful for logging and debugging
 *
 * @returns {string} "enabled" or "disabled"
 */
export function getI18nStatus(): string {
  return isI18nEnabled() ? "enabled" : "disabled";
}

/**
 * Check if a specific locale is enabled
 * This could be extended to support per-locale flags in the future
 *
 * Currently just checks if i18n is globally enabled
 *
 * @param {string} _locale - The locale to check (unused in basic version)
 * @returns {boolean} true if the locale is enabled
 */
export function isLocaleEnabled(_locale: string): boolean {
  // For now, all locales are enabled/disabled together
  // Future: could support per-locale feature flags
  return isI18nEnabled();
}
