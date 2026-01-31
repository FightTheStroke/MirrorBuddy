#!/usr/bin/env tsx

/**
 * Restructure i18n namespace JSON files
 * Moves sibling keys inside the wrapper key matching the filename
 *
 * Plan 109, Wave W2, Task T2-02
 */

import * as fs from "fs";
import * as path from "path";

const LOCALES = ["it", "en", "fr", "de", "es"];
const MESSAGES_DIR = path.join(process.cwd(), "messages");

interface FileRestructureConfig {
  filename: string;
  wrapperKey: string;
  keysToMove: string[];
}

const RESTRUCTURE_CONFIG: FileRestructureConfig[] = [
  {
    filename: "compliance.json",
    wrapperKey: "compliance",
    keysToMove: [
      "legal",
      "aiTransparency",
      "accessibility",
      "contact",
      "aiRegulatoryContacts",
      "dataSubjectRights",
      "cookiePolicy",
      "modelCard",
    ],
  },
  {
    filename: "admin.json",
    wrapperKey: "admin",
    keysToMove: ["dashboard", "parentDashboard"],
  },
  {
    filename: "home.json",
    wrapperKey: "home",
    keysToMove: [
      "loading",
      "sidebar",
      "navigation",
      "appTitle",
      "seasonDefault",
      "header",
    ],
  },
  {
    filename: "welcome.json",
    wrapperKey: "welcome",
    keysToMove: [
      "tierComparison",
      "features",
      "hero",
      "compliance",
      "trialLimits",
      "support",
      "footer",
      "quickStart",
      "trialConsent",
      "valueProposition",
      "accessibilityFirstSection",
      "socialProof",
    ],
  },
  {
    filename: "errors.json",
    wrapperKey: "errors",
    keysToMove: ["notFound", "validation"],
  },
];

function restructureFile(locale: string, config: FileRestructureConfig): void {
  const filePath = path.join(MESSAGES_DIR, locale, config.filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return;
  }

  // Read the JSON file
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);

  // Check if wrapper key exists
  if (!data[config.wrapperKey]) {
    console.warn(
      `⚠️  Wrapper key "${config.wrapperKey}" not found in ${locale}/${config.filename}`,
    );
    return;
  }

  let moveCount = 0;

  // Move each sibling key inside the wrapper
  for (const key of config.keysToMove) {
    if (data[key]) {
      // Move the key inside the wrapper
      data[config.wrapperKey][key] = data[key];
      delete data[key];
      moveCount++;
    }
  }

  // Write back the restructured JSON
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");

  console.log(
    `✅ ${locale}/${config.filename}: Moved ${moveCount} keys inside "${config.wrapperKey}"`,
  );
}

function main(): void {
  console.log("🔄 Starting i18n namespace restructuring...\n");

  for (const config of RESTRUCTURE_CONFIG) {
    console.log(`\n📁 Processing ${config.filename}...`);

    for (const locale of LOCALES) {
      restructureFile(locale, config);
    }
  }

  console.log("\n✅ Restructuring complete!");
  console.log("\nNext steps:");
  console.log("  1. Run: npm run i18n:check");
  console.log("  2. Run: npm run typecheck && npm run build");
}

main();
