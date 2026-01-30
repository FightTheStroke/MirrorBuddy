#!/usr/bin/env tsx
/**
 * Apply i18n namespace refactoring
 *
 * Reads the refactor plan from /tmp/i18n-refactor-plan.json and applies all
 * namespace remaps by updating useTranslations() and getTranslations() calls.
 */

import fs from "fs";
import path from "path";

interface RemapEntry {
  from: string;
  to: string;
  subPath: string;
  files: string[];
  strategy: string;
}

interface RefactorPlan {
  namespaceRemaps: RemapEntry[];
}

interface FileChange {
  filePath: string;
  occurrences: number;
  from: string;
  to: string;
}

interface RefactorResults {
  totalFiles: number;
  totalOccurrences: number;
  fileChanges: FileChange[];
  errors: Array<{ file: string; error: string }>;
}

const PLAN_FILE = "/tmp/i18n-refactor-plan.json";
const RESULTS_FILE = "/tmp/i18n-refactor-results.json";

/**
 * Parse file path to remove line number suffix
 */
function parseFilePath(fileEntry: string): string {
  return fileEntry.split(":")[0];
}

/**
 * Apply namespace refactor to a single file
 */
function refactorFile(
  filePath: string,
  fromNamespace: string,
  toNamespace: string,
): number {
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return 0;
  }

  let content = fs.readFileSync(fullPath, "utf-8");
  let occurrences = 0;

  // Pattern 1: useTranslations('namespace')
  const usePattern1 = new RegExp(
    `useTranslations\\((['"])${escapeRegex(fromNamespace)}\\1\\)`,
    "g",
  );
  const matches1 = content.match(usePattern1);
  if (matches1) {
    occurrences += matches1.length;
    content = content.replace(usePattern1, `useTranslations('${toNamespace}')`);
  }

  // Pattern 2: getTranslations('namespace')
  const getPattern1 = new RegExp(
    `getTranslations\\((['"])${escapeRegex(fromNamespace)}\\1\\)`,
    "g",
  );
  const matches2 = content.match(getPattern1);
  if (matches2) {
    occurrences += matches2.length;
    content = content.replace(getPattern1, `getTranslations('${toNamespace}')`);
  }

  // Pattern 3: useTranslations("namespace")
  const usePattern2 = new RegExp(
    `useTranslations\\((['"])${escapeRegex(fromNamespace)}\\1\\)`,
    "g",
  );
  const matches3 = content.match(usePattern2);
  if (matches3 && matches3.length > occurrences) {
    content = content.replace(usePattern2, `useTranslations('${toNamespace}')`);
  }

  // Pattern 4: getTranslations("namespace")
  const getPattern2 = new RegExp(
    `getTranslations\\((['"])${escapeRegex(fromNamespace)}\\1\\)`,
    "g",
  );
  const matches4 = content.match(getPattern2);
  if (matches4 && matches4.length > occurrences) {
    content = content.replace(getPattern2, `getTranslations('${toNamespace}')`);
  }

  if (occurrences > 0) {
    fs.writeFileSync(fullPath, content, "utf-8");
    console.log(`✓ ${filePath}: ${occurrences} occurrence(s) updated`);
  }

  return occurrences;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply all namespace remaps from the plan
 */
function applyRefactorPlan(): RefactorResults {
  console.log("📖 Reading refactor plan from", PLAN_FILE);

  const planData = fs.readFileSync(PLAN_FILE, "utf-8");
  const plan: RefactorPlan = JSON.parse(planData);

  const results: RefactorResults = {
    totalFiles: 0,
    totalOccurrences: 0,
    fileChanges: [],
    errors: [],
  };

  console.log(
    `\n🔄 Processing ${plan.namespaceRemaps.length} namespace remaps...\n`,
  );

  for (const remap of plan.namespaceRemaps) {
    const { from, to, subPath, files } = remap;
    const toNamespace = `${to}.${subPath}`;

    console.log(`\n📝 Remapping: ${from} → ${toNamespace}`);
    console.log(`   Strategy: ${remap.strategy}`);
    console.log(`   Files: ${files.length}`);

    // Get unique file paths (remove duplicates and line numbers)
    const uniqueFiles = Array.from(new Set(files.map(parseFilePath)));

    for (const fileEntry of uniqueFiles) {
      try {
        const occurrences = refactorFile(fileEntry, from, toNamespace);

        if (occurrences > 0) {
          results.totalFiles++;
          results.totalOccurrences += occurrences;
          results.fileChanges.push({
            filePath: fileEntry,
            occurrences,
            from,
            to: toNamespace,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error processing ${fileEntry}:`, errorMsg);
        results.errors.push({
          file: fileEntry,
          error: errorMsg,
        });
      }
    }
  }

  return results;
}

/**
 * Main execution
 */
function main() {
  console.log("🚀 i18n Namespace Refactor Script\n");
  console.log("=".repeat(60));

  try {
    const results = applyRefactorPlan();

    console.log("\n" + "=".repeat(60));
    console.log("\n📊 REFACTOR SUMMARY\n");
    console.log(`✓ Files modified: ${results.totalFiles}`);
    console.log(`✓ Total occurrences updated: ${results.totalOccurrences}`);

    if (results.errors.length > 0) {
      console.log(`⚠️  Errors encountered: ${results.errors.length}`);
      results.errors.forEach(({ file, error }) => {
        console.log(`   - ${file}: ${error}`);
      });
    }

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\n💾 Results saved to: ${RESULTS_FILE}`);

    console.log("\n✅ Refactor complete!");
    console.log("\nNext steps:");
    console.log("1. Run: npm run lint");
    console.log("2. Verify reduced i18n warnings");
    console.log("3. Run: npm run typecheck && npm run build");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
