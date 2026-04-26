/**
 * Browser preference detection for accessibility
 * Detects OS/browser preferences and maps them to AccessibilitySettings
 */

import type { AccessibilitySettings } from "./accessibility-store/types";

/**
 * Detected browser preferences
 */
export interface BrowserA11yPreferences {
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;
  prefersHighContrast: boolean;
}

/**
 * Detect browser/OS accessibility preferences
 */
export function detectBrowserPreferences(): BrowserA11yPreferences {
  if (typeof window === "undefined") {
    return {
      prefersReducedMotion: false,
      prefersDarkMode: false,
      prefersHighContrast: false,
    };
  }

  return {
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
    prefersDarkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
    prefersHighContrast: window.matchMedia("(prefers-contrast: more)").matches,
  };
}

/**
 * Convert browser preferences to accessibility settings overrides
 * Only returns settings that should be applied based on detected preferences
 */
export function browserPrefsToSettings(
  prefs: BrowserA11yPreferences,
): Partial<AccessibilitySettings> {
  const settings: Partial<AccessibilitySettings> = {};

  if (prefs.prefersReducedMotion) {
    settings.reducedMotion = true;
  }

  if (prefs.prefersHighContrast) {
    settings.highContrast = true;
  }

  // Note: Dark mode is handled by ThemeProvider, not here

  return settings;
}

/**
 * Check if any relevant browser preferences are detected
 */
export function hasBrowserA11yPreferences(): boolean {
  const prefs = detectBrowserPreferences();
  return prefs.prefersReducedMotion || prefs.prefersHighContrast;
}
