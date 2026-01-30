#!/usr/bin/env npx tsx
/**
 * i18n Sync Namespaces Script
 *
 * Ensures all locales have the same namespace files and keys as Italian (reference).
 * Missing keys are added with Italian value as placeholder.
 *
 * Usage: npx tsx scripts/i18n-sync-namespaces.ts [--dry-run] [--add-missing]
 */

import * as fs from "fs";
import * as path from "path";

const REFERENCE_LOCALE = "it";
const OTHER_LOCALES = ["en", "de", "es", "fr"] as const;
const MESSAGES_DIR = path.join(process.cwd(), "messages");

const NAMESPACES = [
  "common",
  "auth",
  "admin",
  "chat",
  "tools",
  "settings",
  "compliance",
  "consent",
  "education",
  "home",
  "navigation",
  "errors",
  "welcome",
  "metadata",
] as const;

interface SyncReport {
  locale: string;
  namespace: string;
  missingKeys: string[];
  extraKeys: string[];
}

function getAllKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) {
    return [prefix];
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, newPrefix));
    } else {
      keys.push(newPrefix);
    }
  }
  return keys;
}

function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setValueByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

function compareNamespace(
  refData: unknown,
  targetData: unknown,
  locale: string,
  namespace: string,
): SyncReport {
  const refKeys = getAllKeys(refData);
  const targetKeys = getAllKeys(targetData);

  const missingKeys = refKeys.filter((k) => !targetKeys.includes(k));
  const extraKeys = targetKeys.filter((k) => !refKeys.includes(k));

  return {
    locale,
    namespace,
    missingKeys,
    extraKeys,
  };
}

function loadNamespaceFile(locale: string, namespace: string): unknown | null {
  const filePath = path.join(MESSAGES_DIR, locale, `${namespace}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveNamespaceFile(
  locale: string,
  namespace: string,
  data: unknown,
): void {
  const filePath = path.join(MESSAGES_DIR, locale, `${namespace}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function syncNamespace(
  refData: unknown,
  targetData: unknown,
  missingKeys: string[],
): unknown {
  const result =
    typeof targetData === "object" && targetData !== null
      ? JSON.parse(JSON.stringify(targetData))
      : {};

  for (const key of missingKeys) {
    const refValue = getValueByPath(refData, key);
    // Mark missing translations with [TRANSLATE] prefix if it's a string
    const value =
      typeof refValue === "string" ? `[TRANSLATE] ${refValue}` : refValue;
    setValueByPath(result as Record<string, unknown>, key, value);
  }

  return result;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const addMissing = args.includes("--add-missing");

  console.log("🔄 i18n Sync Namespaces Script");
  console.log(`   Reference locale: ${REFERENCE_LOCALE}`);
  console.log(
    `   Mode: ${dryRun ? "DRY RUN" : addMissing ? "ADD MISSING" : "REPORT ONLY"}`,
  );
  console.log("");

  let totalMissing = 0;
  let totalExtra = 0;
  const reports: SyncReport[] = [];

  for (const namespace of NAMESPACES) {
    const refData = loadNamespaceFile(REFERENCE_LOCALE, namespace);

    if (!refData) {
      console.warn(
        `⚠️  Reference file missing: ${REFERENCE_LOCALE}/${namespace}.json`,
      );
      continue;
    }

    for (const locale of OTHER_LOCALES) {
      let targetData = loadNamespaceFile(locale, namespace);

      if (!targetData) {
        console.log(`❌ ${locale}/${namespace}.json - FILE MISSING`);
        if (addMissing && !dryRun) {
          // Create file with reference data, marked for translation
          const newData = syncNamespace(refData, {}, getAllKeys(refData));
          saveNamespaceFile(locale, namespace, newData);
          console.log(
            `   ✅ Created with ${getAllKeys(refData).length} keys (marked [TRANSLATE])`,
          );
        }
        continue;
      }

      const report = compareNamespace(refData, targetData, locale, namespace);
      reports.push(report);

      if (report.missingKeys.length === 0 && report.extraKeys.length === 0) {
        console.log(`✅ ${locale}/${namespace}.json - OK`);
        continue;
      }

      console.log(`⚠️  ${locale}/${namespace}.json:`);

      if (report.missingKeys.length > 0) {
        console.log(`   Missing ${report.missingKeys.length} keys:`);
        report.missingKeys
          .slice(0, 5)
          .forEach((k) => console.log(`     - ${k}`));
        if (report.missingKeys.length > 5) {
          console.log(`     ... and ${report.missingKeys.length - 5} more`);
        }
        totalMissing += report.missingKeys.length;

        if (addMissing && !dryRun) {
          targetData = syncNamespace(refData, targetData, report.missingKeys);
          saveNamespaceFile(locale, namespace, targetData);
          console.log(`   ✅ Added missing keys (marked [TRANSLATE])`);
        }
      }

      if (report.extraKeys.length > 0) {
        console.log(
          `   Extra ${report.extraKeys.length} keys (not in reference):`,
        );
        report.extraKeys.slice(0, 3).forEach((k) => console.log(`     + ${k}`));
        if (report.extraKeys.length > 3) {
          console.log(`     ... and ${report.extraKeys.length - 3} more`);
        }
        totalExtra += report.extraKeys.length;
      }
    }

    console.log("");
  }

  console.log("📊 Summary:");
  console.log(`   Total missing keys: ${totalMissing}`);
  console.log(`   Total extra keys: ${totalExtra}`);

  if (totalMissing > 0 && !addMissing) {
    console.log(
      "\n💡 Run with --add-missing to add missing keys from reference.",
    );
  }

  if (dryRun) {
    console.log("\n   Run without --dry-run to apply changes.");
  }

  // Exit with error code if there are issues
  if (totalMissing > 0 || totalExtra > 0) {
    process.exit(1);
  }
}

main();
