/**
 * Cookie storage for accessibility preferences
 * Persists a11y settings across sessions without requiring authentication
 */

import type { AccessibilitySettings } from "./accessibility-store/types";

const A11Y_COOKIE_NAME = "mirrorbuddy-a11y";
const COOKIE_VERSION = "1";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

/**
 * Data structure stored in the a11y cookie
 */
export interface A11yCookieData {
  version: string;
  activeProfile: string | null;
  overrides: Partial<AccessibilitySettings>;
  browserDetectedApplied: boolean;
}

/**
 * Default cookie data
 */
const defaultCookieData: A11yCookieData = {
  version: COOKIE_VERSION,
  activeProfile: null,
  overrides: {},
  browserDetectedApplied: false,
};

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Get the a11y cookie data
 * Returns null if cookie doesn't exist or is invalid
 */
export function getA11yCookie(): A11yCookieData | null {
  if (!isBrowser()) return null;

  try {
    const cookies = document.cookie.split(";");
    const a11yCookie = cookies.find((c) =>
      c.trim().startsWith(`${A11Y_COOKIE_NAME}=`),
    );

    if (!a11yCookie) return null;

    const value = a11yCookie.split("=")[1];
    const decoded = decodeURIComponent(value);
    const data = JSON.parse(decoded) as A11yCookieData;

    // Version check - return null if outdated to trigger fresh detection
    if (data.version !== COOKIE_VERSION) {
      clearA11yCookie();
      return null;
    }

    return data;
  } catch {
    // Invalid cookie data - clear it
    clearA11yCookie();
    return null;
  }
}

/**
 * Set the a11y cookie with updated data
 */
export function setA11yCookie(data: Partial<A11yCookieData>): void {
  if (!isBrowser()) return;

  const existing = getA11yCookie() || defaultCookieData;
  const updated: A11yCookieData = {
    ...existing,
    ...data,
    version: COOKIE_VERSION,
  };

  const encoded = encodeURIComponent(JSON.stringify(updated));
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();

  document.cookie = `${A11Y_COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; expires=${expires}; SameSite=Lax`;
}

/**
 * Clear the a11y cookie
 */
export function clearA11yCookie(): void {
  if (!isBrowser()) return;

  document.cookie = `${A11Y_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Check if the a11y cookie exists
 */
export function hasA11yCookie(): boolean {
  return getA11yCookie() !== null;
}
