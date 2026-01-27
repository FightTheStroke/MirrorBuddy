#!/usr/bin/env tsx

import fs from "fs";
import path from "path";

const LOCALES = ["it", "en", "fr", "de", "es"];
const MESSAGES_DIR = path.join(process.cwd(), "messages");
const REFERENCE_LOCALE = "it";
const NAMESPACES = [
  "common",
  "auth",
  "admin",
  "chat",
  "tools",
  "settings",
  "compliance",
  "education",
  "navigation",
  "errors",
  "welcome",
  "metadata",
];

/**
 * Recursively extract all keys from a nested object
 * Returns a Set of flattened key paths (e.g., "common.loading")
 */
function extractKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();

  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Recursively extract nested keys
      extractKeys(value, fullKey).forEach((k) => keys.add(k));
    } else {
      // Add the leaf key
      keys.add(fullKey);
    }
  });

  return keys;
}

/**
 * Load all namespace files for a locale and merge them
 * Updated for namespace-based structure (ADR 0082)
 */
function loadLocaleMessages(locale: string): Record<string, unknown> {
  const localeDir = path.join(MESSAGES_DIR, locale);
  const merged: Record<string, unknown> = {};

  for (const ns of NAMESPACES) {
    const filePath = path.join(localeDir, `${ns}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      Object.assign(merged, JSON.parse(content));
    }
  }

  return merged;
}

/**
 * Main verification function
 */
function main(): void {
  console.log("Checking i18n completeness...\n");

  // Load all message files
  const keySets: Record<string, Set<string>> = {};

  try {
    for (const locale of LOCALES) {
      const messages = loadLocaleMessages(locale);
      keySets[locale] = extractKeys(messages);
    }
  } catch (error) {
    console.error(`Error reading message files: ${error}`);
    process.exit(1);
  }

  const referenceKeys = keySets[REFERENCE_LOCALE];
  console.log(
    `Reference locale: ${REFERENCE_LOCALE} (${referenceKeys.size} keys)\n`,
  );

  let totalMissingKeys = 0;

  for (const locale of LOCALES) {
    if (locale === REFERENCE_LOCALE) {
      console.log(
        `✓ ${locale}: ${keySets[locale].size}/${referenceKeys.size} keys`,
      );
      continue;
    }

    const localeKeys = keySets[locale];
    const missing: string[] = [];
    const extra: string[] = [];

    // Find missing keys
    for (const key of referenceKeys) {
      if (!localeKeys.has(key)) {
        missing.push(key);
      }
    }

    // Find extra keys
    for (const key of localeKeys) {
      if (!referenceKeys.has(key)) {
        extra.push(key);
      }
    }

    const hasIssues = missing.length > 0 || extra.length > 0;
    const status = hasIssues ? "✗" : "✓";
    console.log(
      `${status} ${locale}: ${localeKeys.size}/${referenceKeys.size} keys`,
    );

    if (missing.length > 0) {
      totalMissingKeys += missing.length;
      const displayKeys = missing.slice(0, 10).join(", ");
      const suffix =
        missing.length > 10 ? ` (+${missing.length - 10} more)` : "";
      console.log(`  Missing: ${displayKeys}${suffix}`);
    }

    if (extra.length > 0) {
      const displayKeys = extra.slice(0, 10).join(", ");
      const suffix = extra.length > 10 ? ` (+${extra.length - 10} more)` : "";
      console.log(`  Extra: ${displayKeys}${suffix}`);
    }
  }

  const resultWord = totalMissingKeys > 0 ? "FAIL" : "PASS";
  if (totalMissingKeys > 0) {
    const keyWord = totalMissingKeys === 1 ? "missing key" : "missing keys";
    console.log(`\nResult: ${resultWord} (${totalMissingKeys} ${keyWord})`);
  } else {
    console.log(`\nResult: ${resultWord}`);
  }

  process.exit(totalMissingKeys > 0 ? 1 : 0);
}

main();
