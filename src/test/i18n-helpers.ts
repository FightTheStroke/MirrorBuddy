/**
 * i18n Test Helpers
 *
 * Utilities for testing components that use translations without
 * hardcoding specific translated strings. This allows translations
 * to change without breaking tests.
 *
 * Usage:
 * ```tsx
 * import { getTranslation, expectElementWithTranslation } from '@/test/i18n-helpers';
 *
 * // Get translated string for assertion
 * const saveText = getTranslation('common.save');
 * expect(screen.getByText(saveText)).toBeInTheDocument();
 *
 * // Or use the helper directly
 * expectElementWithTranslation('common.save');
 * ```
 */

import { screen } from "@testing-library/react";
import { expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// Deep merge utility (same as setup.ts)
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const tVal = target[key];
    const sVal = source[key];
    if (
      tVal &&
      sVal &&
      typeof tVal === "object" &&
      typeof sVal === "object" &&
      !Array.isArray(tVal) &&
      !Array.isArray(sVal)
    ) {
      target[key] = deepMerge(
        { ...(tVal as Record<string, unknown>) },
        sVal as Record<string, unknown>,
      );
    } else {
      target[key] = sVal;
    }
  }
  return target;
}

// Load all Italian messages (cached)
let cachedMessages: Record<string, unknown> | null = null;

function loadMessages(): Record<string, unknown> {
  if (cachedMessages) return cachedMessages;

  const localeDir = join(process.cwd(), "messages", "it");
  const files = readdirSync(localeDir).filter((f) => f.endsWith(".json"));
  const merged: Record<string, unknown> = {};

  for (const file of files) {
    const filePath = join(localeDir, file);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const content = readFileSync(filePath, "utf-8");
    deepMerge(merged, JSON.parse(content));
  }

  cachedMessages = merged;
  return merged;
}

/**
 * Converts kebab-case to camelCase
 */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Tries to find a key in an object, attempting both kebab-case and camelCase.
 */
function findKey(
  obj: Record<string, unknown>,
  key: string,
): [unknown, boolean] {
  if (key in obj) return [obj[key], true];
  const camelKey = kebabToCamel(key);
  if (camelKey in obj) return [obj[camelKey], true];
  return [undefined, false];
}

/**
 * Get a translation by its full key path.
 *
 * @param key - Dot-separated key path (e.g., "common.save", "admin.tiers.form.limits")
 * @param values - Optional interpolation values (e.g., { count: 5 })
 * @returns The translated string, or the key if not found
 *
 * @example
 * ```tsx
 * const text = getTranslation('common.save'); // "Salva"
 * const text = getTranslation('trial.remaining', { count: 5 }); // "5 rimanenti"
 * ```
 */
export function getTranslation(
  key: string,
  values?: Record<string, unknown>,
): string {
  const messages = loadMessages();
  const parts = key.split(".");

  let current: unknown = messages;

  for (const part of parts) {
    if (current && typeof current === "object") {
      const [value, found] = findKey(current as Record<string, unknown>, part);
      if (found) {
        current = value;
      } else {
        // Key not found - return key as fallback (silent in test env)
        return key;
      }
    } else {
      // Key not found - return key as fallback (silent in test env)
      return key;
    }
  }

  if (typeof current !== "string") {
    // Key is not a string - return key as fallback (silent in test env)
    return key;
  }

  // Handle interpolation
  if (values) {
    return current.replace(/\{(\w+)\}/g, (_, name) =>
      values[name] !== undefined ? String(values[name]) : `{${name}}`,
    );
  }

  return current;
}

/**
 * Get translation and find element by that text.
 *
 * @param key - Dot-separated key path
 * @param values - Optional interpolation values
 * @returns The element found by the translated text
 *
 * @example
 * ```tsx
 * const button = getByTranslation('common.save');
 * fireEvent.click(button);
 * ```
 */
export function getByTranslation(
  key: string,
  values?: Record<string, unknown>,
): HTMLElement {
  const text = getTranslation(key, values);
  return screen.getByText(text);
}

/**
 * Query for element by translation (returns null if not found).
 */
export function queryByTranslation(
  key: string,
  values?: Record<string, unknown>,
): HTMLElement | null {
  const text = getTranslation(key, values);
  return screen.queryByText(text);
}

/**
 * Assert that an element with the translated text exists.
 *
 * @param key - Dot-separated key path
 * @param values - Optional interpolation values
 *
 * @example
 * ```tsx
 * expectElementWithTranslation('admin.tiers.form.limits');
 * expectElementWithTranslation('trial.remaining', { count: 5 });
 * ```
 */
export function expectElementWithTranslation(
  key: string,
  values?: Record<string, unknown>,
): void {
  const text = getTranslation(key, values);
  expect(screen.getByText(text)).toBeInTheDocument();
}

/**
 * Assert that an element with the translated text does NOT exist.
 */
export function expectNoElementWithTranslation(
  key: string,
  values?: Record<string, unknown>,
): void {
  const text = getTranslation(key, values);
  expect(screen.queryByText(text)).not.toBeInTheDocument();
}

/**
 * Get a regex that matches the translation (useful for partial matches).
 *
 * @param key - Dot-separated key path
 * @param flags - Regex flags (default: "i" for case-insensitive)
 *
 * @example
 * ```tsx
 * const regex = getTranslationRegex('common.save');
 * expect(screen.getByText(regex)).toBeInTheDocument();
 * ```
 */
export function getTranslationRegex(key: string, flags = "i"): RegExp {
  const text = getTranslation(key);
  // Escape special regex characters
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // eslint-disable-next-line security/detect-non-literal-regexp -- safe: escaped translation text for testing
  return new RegExp(escaped, flags);
}

/**
 * Check if a translation key exists in the messages.
 */
export function hasTranslation(key: string): boolean {
  const messages = loadMessages();
  const parts = key.split(".");

  let current: unknown = messages;

  for (const part of parts) {
    if (current && typeof current === "object") {
      const [value, found] = findKey(current as Record<string, unknown>, part);
      if (found) {
        current = value;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  return typeof current === "string";
}
