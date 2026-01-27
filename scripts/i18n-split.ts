#!/usr/bin/env npx tsx
/**
 * i18n Split Script
 *
 * Splits monolithic messages/{locale}.json files into namespace-based structure:
 * messages/{locale}/{namespace}.json
 *
 * Usage: npx tsx scripts/i18n-split.ts [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";

const LOCALES = ["it", "en", "de", "es", "fr"] as const;
const MESSAGES_DIR = path.join(process.cwd(), "messages");

// Mapping from existing top-level keys to target namespaces
const NAMESPACE_MAPPING: Record<string, string> = {
  // common - Global UI elements
  common: "common",
  ui: "common",
  status: "common",

  // auth - Authentication flows
  auth: "auth",
  invite: "auth",

  // admin - Admin dashboard
  admin: "admin",
  dashboard: "admin",
  parentDashboard: "admin",

  // chat - Chat interface
  chat: "chat",
  conversation: "chat",
  session: "chat",
  voice: "chat",
  typing: "chat",

  // tools - All tools
  tools: "tools",
  astuccio: "tools",
  zaino: "tools",
  studyKit: "tools",

  // settings - User settings
  settings: "settings",
  profile: "settings",
  accessibility: "settings",
  consent: "settings",
  telemetry: "settings",
  ambientAudio: "settings",
  scheduler: "settings",
  googleDrive: "settings",

  // compliance - Legal pages
  compliance: "compliance",
  aiTransparency: "compliance",
  legal: "compliance",
  contact: "compliance",

  // education - Learning features
  education: "education",
  coaches: "education",
  supporti: "education",
  maestros: "education",

  // navigation - Menus, sidebar
  navigation: "navigation",

  // errors - Error messages
  errors: "errors",
  "not-found": "errors",
  validation: "errors",

  // welcome - Home, onboarding
  welcome: "welcome",
  home: "welcome",
  onboarding: "welcome",

  // metadata - SEO, page titles
  metadata: "metadata",
};

// Target namespaces (for validation)
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
] as const;

interface SplitResult {
  locale: string;
  namespace: string;
  keyCount: number;
  sourceKeys: string[];
}

function splitLocale(
  locale: string,
  dryRun: boolean,
): { results: SplitResult[]; unmapped: string[] } {
  const sourceFile = path.join(MESSAGES_DIR, `${locale}.json`);

  if (!fs.existsSync(sourceFile)) {
    console.warn(`⚠️  Source file not found: ${sourceFile}`);
    return { results: [], unmapped: [] };
  }

  const sourceContent = JSON.parse(fs.readFileSync(sourceFile, "utf-8"));
  const sourceKeys = Object.keys(sourceContent);

  // Group keys by target namespace
  const namespaceData: Record<string, Record<string, unknown>> = {};
  const unmappedKeys: string[] = [];

  for (const ns of NAMESPACES) {
    namespaceData[ns] = {};
  }

  for (const key of sourceKeys) {
    const targetNamespace = NAMESPACE_MAPPING[key];
    if (targetNamespace) {
      // Store under original key name within namespace
      namespaceData[targetNamespace][key] = sourceContent[key];
    } else {
      unmappedKeys.push(key);
    }
  }

  const results: SplitResult[] = [];

  // Create locale directory
  const localeDir = path.join(MESSAGES_DIR, locale);
  if (!dryRun && !fs.existsSync(localeDir)) {
    fs.mkdirSync(localeDir, { recursive: true });
  }

  // Write namespace files
  for (const ns of NAMESPACES) {
    const data = namespaceData[ns];
    const keyCount = Object.keys(data).length;

    if (keyCount === 0) {
      // Write empty object for consistency
      if (!dryRun) {
        fs.writeFileSync(
          path.join(localeDir, `${ns}.json`),
          JSON.stringify({}, null, 2) + "\n",
        );
      }
      continue;
    }

    const sourceKeysInNs = Object.keys(data);
    results.push({
      locale,
      namespace: ns,
      keyCount,
      sourceKeys: sourceKeysInNs,
    });

    if (!dryRun) {
      const outputFile = path.join(localeDir, `${ns}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2) + "\n");
    }
  }

  return { results, unmapped: unmappedKeys };
}

function countDeepKeys(obj: unknown): number {
  if (typeof obj !== "object" || obj === null) {
    return 1;
  }
  return Object.values(obj).reduce(
    (sum: number, val) => sum + countDeepKeys(val),
    0,
  );
}

function validateSplit(locale: string): {
  valid: boolean;
  originalCount: number;
  splitCount: number;
} {
  const sourceFile = path.join(MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(sourceFile)) {
    return { valid: false, originalCount: 0, splitCount: 0 };
  }

  const sourceContent = JSON.parse(fs.readFileSync(sourceFile, "utf-8"));
  const originalCount = countDeepKeys(sourceContent);

  let splitCount = 0;
  const localeDir = path.join(MESSAGES_DIR, locale);

  for (const ns of NAMESPACES) {
    const nsFile = path.join(localeDir, `${ns}.json`);
    if (fs.existsSync(nsFile)) {
      const nsContent = JSON.parse(fs.readFileSync(nsFile, "utf-8"));
      splitCount += countDeepKeys(nsContent);
    }
  }

  return {
    valid: originalCount === splitCount,
    originalCount,
    splitCount,
  };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("🔄 i18n Split Script");
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(`   Source: messages/{locale}.json`);
  console.log(`   Target: messages/{locale}/{namespace}.json\n`);

  const allUnmapped = new Set<string>();

  for (const locale of LOCALES) {
    console.log(`\n📁 Processing ${locale}...`);
    const { results, unmapped } = splitLocale(locale, dryRun);

    if (results.length === 0) {
      console.log(`   ⏭️  Skipped (no source file or empty)`);
      continue;
    }

    for (const r of results) {
      console.log(`   ✅ ${r.namespace}.json: ${r.keyCount} top-level keys`);
    }

    if (unmapped.length > 0) {
      console.log(`   ⚠️  Unmapped keys: ${unmapped.join(", ")}`);
      unmapped.forEach((k) => allUnmapped.add(k));
    }

    // Validate
    if (!dryRun) {
      const validation = validateSplit(locale);
      if (validation.valid) {
        console.log(
          `   ✓ Validation passed (${validation.originalCount} keys)`,
        );
      } else {
        console.log(
          `   ❌ Validation FAILED: original=${validation.originalCount}, split=${validation.splitCount}`,
        );
      }
    }
  }

  if (allUnmapped.size > 0) {
    console.log(`\n⚠️  Unmapped keys found across locales:`);
    console.log(`   ${Array.from(allUnmapped).join(", ")}`);
    console.log(`   Add these to NAMESPACE_MAPPING in this script.`);
  }

  console.log("\n✅ Split complete!");
  if (dryRun) {
    console.log("   Run without --dry-run to execute.");
  } else {
    console.log("   Namespace files created in messages/{locale}/");
  }
}

main();
