/**
 * i18n Extraction Script (T1-01)
 * Runs ESLint and extracts all i18n-related warnings into a structured JSON mapping.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface ESLintMessage {
  ruleId: string;
  severity: number;
  message: string;
  line: number;
  column: number;
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
}

interface WarningMapping {
  missingNamespaces: Record<string, string[]>;
  missingKeys: Record<string, Record<string, string[]>>;
  summary: {
    totalWarnings: number;
    uniqueNamespaces: number;
    uniqueKeys: number;
    affectedFiles: number;
  };
}

/**
 * Parse ESLint message to extract namespace or key information
 */
function parseMessage(message: string): {
  type: "namespace" | "key";
  namespace?: string;
  key?: string;
} | null {
  // Pattern: Translation namespace "X" does not exist
  const namespaceMatch = message.match(
    /Translation namespace "([^"]+)" does not exist/,
  );
  if (namespaceMatch) {
    return {
      type: "namespace",
      namespace: namespaceMatch[1],
    };
  }

  // Pattern: Translation key "namespace.key" does not exist
  const keyMatch = message.match(
    /Translation key "([^"]+)\.([^"]+)" does not exist/,
  );
  if (keyMatch) {
    return {
      type: "key",
      namespace: keyMatch[1],
      key: keyMatch[2],
    };
  }

  return null;
}

/**
 * Run ESLint programmatically and get JSON output
 */
function runESLint(): ESLintResult[] {
  try {
    console.log("Running ESLint to extract i18n warnings...");
    const output = execSync("npx eslint src/ --format json", {
      encoding: "utf-8",
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return JSON.parse(output);
  } catch (error: unknown) {
    const execError = error as { stdout?: string };
    // ESLint exits with code 1 when there are warnings/errors
    // But still outputs JSON to stdout
    if (execError.stdout) {
      try {
        return JSON.parse(execError.stdout);
      } catch {
        console.error("Failed to parse ESLint output");
        throw error;
      }
    }
    throw error;
  }
}

/**
 * Extract warnings and build mapping structure
 */
function extractWarnings(results: ESLintResult[]): WarningMapping {
  const mapping: WarningMapping = {
    missingNamespaces: {},
    missingKeys: {},
    summary: {
      totalWarnings: 0,
      uniqueNamespaces: 0,
      uniqueKeys: 0,
      affectedFiles: 0,
    },
  };

  const affectedFilesSet = new Set<string>();

  for (const result of results) {
    if (result.messages.length === 0) continue;

    // Convert absolute path to relative path from project root
    const relativePath = path.relative(process.cwd(), result.filePath);

    for (const msg of result.messages) {
      // Only process our custom rule
      if (msg.ruleId !== "local-rules/no-missing-i18n-keys") continue;

      mapping.summary.totalWarnings++;
      affectedFilesSet.add(relativePath);

      const parsed = parseMessage(msg.message);
      if (!parsed) continue;

      const location = `${relativePath}:${msg.line}`;

      if (parsed.type === "namespace" && parsed.namespace) {
        // Missing namespace
        if (!mapping.missingNamespaces[parsed.namespace]) {
          mapping.missingNamespaces[parsed.namespace] = [];
        }
        mapping.missingNamespaces[parsed.namespace].push(location);
      } else if (parsed.type === "key" && parsed.namespace && parsed.key) {
        // Missing key
        if (!mapping.missingKeys[parsed.namespace]) {
          mapping.missingKeys[parsed.namespace] = {};
        }
        if (!mapping.missingKeys[parsed.namespace][parsed.key]) {
          mapping.missingKeys[parsed.namespace][parsed.key] = [];
        }
        mapping.missingKeys[parsed.namespace][parsed.key].push(location);
      }
    }
  }

  // Calculate unique counts
  mapping.summary.uniqueNamespaces = Object.keys(
    mapping.missingNamespaces,
  ).length;

  let totalKeys = 0;
  for (const nsKeys of Object.values(mapping.missingKeys)) {
    totalKeys += Object.keys(nsKeys).length;
  }
  mapping.summary.uniqueKeys = totalKeys;
  mapping.summary.affectedFiles = affectedFilesSet.size;

  return mapping;
}

/**
 * Print human-readable summary
 */
function printSummary(mapping: WarningMapping): void {
  console.log("\n" + "=".repeat(60));
  console.log("i18n Warning Extraction Summary");
  console.log("=".repeat(60));
  console.log(`Total warnings: ${mapping.summary.totalWarnings}`);
  console.log(`Affected files: ${mapping.summary.affectedFiles}`);
  console.log(`Unique missing namespaces: ${mapping.summary.uniqueNamespaces}`);
  console.log(`Unique missing keys: ${mapping.summary.uniqueKeys}`);
  console.log("=".repeat(60));

  if (mapping.summary.uniqueNamespaces > 0) {
    console.log("\nMissing Namespaces:");
    for (const [ns, locations] of Object.entries(mapping.missingNamespaces)) {
      console.log(`  - ${ns} (${locations.length} occurrences)`);
    }
  }

  if (mapping.summary.uniqueKeys > 0) {
    console.log("\nMissing Keys by Namespace:");
    for (const [ns, keys] of Object.entries(mapping.missingKeys)) {
      const keyCount = Object.keys(keys).length;
      console.log(`  - ${ns}: ${keyCount} keys`);
    }
  }

  console.log("\n");
}

/**
 * Main execution
 */
function main() {
  try {
    // Run ESLint and get results
    const results = runESLint();

    // Extract warnings into structured mapping
    const mapping = extractWarnings(results);

    // Write to output file
    const outputPath = "/tmp/i18n-warning-map.json";
    fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2), "utf-8");

    console.log(`\nWarning mapping written to: ${outputPath}`);

    // Print human-readable summary
    printSummary(mapping);

    process.exit(0);
  } catch (error) {
    console.error("Error running extraction script:", error);
    process.exit(1);
  }
}

main();
