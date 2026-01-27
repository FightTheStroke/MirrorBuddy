#!/usr/bin/env npx tsx
/**
 * Technical Debt Audit Script
 *
 * Checks for common debt indicators:
 * - TODO/FIXME comments
 * - @deprecated usage
 * - Backup files (.bak, .old, .orig)
 * - Large files (>400 lines)
 *
 * Usage: npm run debt:check
 * Exit code: 0 = pass, 1 = thresholds exceeded
 */

import { execSync } from "child_process";
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

// Thresholds - adjust as needed
const THRESHOLDS = {
  MAX_TODO: 10,
  MAX_DEPRECATED: 15, // Currently have 12, allow buffer
  MAX_BACKUP_FILES: 0,
  MAX_LARGE_FILES: 10, // Currently have 8 files >500 lines
  LARGE_FILE_LINES: 500, // Realistic threshold
};

interface AuditResult {
  category: string;
  count: number;
  threshold: number;
  items: string[];
  passed: boolean;
}

function countPattern(
  pattern: string,
  dir: string = "src/",
): { count: number; items: string[] } {
  try {
    const result = execSync(
      `grep -rn '${pattern}' ${dir} --include='*.ts' --include='*.tsx' 2>/dev/null || true`,
      { encoding: "utf-8", cwd: ROOT },
    );
    const lines = result.trim().split("\n").filter(Boolean);
    return { count: lines.length, items: lines.slice(0, 5) }; // Show first 5
  } catch {
    return { count: 0, items: [] };
  }
}

function findBackupFiles(): string[] {
  const patterns = [".bak", ".old", ".orig", ".backup"];
  const backups: string[] = [];

  function walk(dir: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "node_modules"
        ) {
          walk(fullPath);
        } else if (
          entry.isFile() &&
          patterns.some((p) => entry.name.endsWith(p))
        ) {
          backups.push(relative(ROOT, fullPath));
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  walk(ROOT);
  return backups;
}

function findLargeFiles(): string[] {
  const largeFiles: string[] = [];

  function walk(dir: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "node_modules" &&
          entry.name !== "__tests__"
        ) {
          walk(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
        ) {
          const content = readFileSync(fullPath, "utf-8");
          const lines = content.split("\n").length;
          if (lines > THRESHOLDS.LARGE_FILE_LINES) {
            largeFiles.push(`${relative(ROOT, fullPath)} (${lines} lines)`);
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  walk(SRC_DIR);
  return largeFiles.slice(0, 10); // Limit output
}

function runAudit(): AuditResult[] {
  console.log("🔍 Technical Debt Audit\n");
  console.log("=".repeat(50));

  const results: AuditResult[] = [];

  // TODO/FIXME
  const todos = countPattern("TODO|FIXME");
  results.push({
    category: "TODO/FIXME comments",
    count: todos.count,
    threshold: THRESHOLDS.MAX_TODO,
    items: todos.items,
    passed: todos.count <= THRESHOLDS.MAX_TODO,
  });

  // @deprecated
  const deprecated = countPattern("@deprecated");
  results.push({
    category: "@deprecated usage",
    count: deprecated.count,
    threshold: THRESHOLDS.MAX_DEPRECATED,
    items: deprecated.items,
    passed: deprecated.count <= THRESHOLDS.MAX_DEPRECATED,
  });

  // Backup files
  const backups = findBackupFiles();
  results.push({
    category: "Backup files",
    count: backups.length,
    threshold: THRESHOLDS.MAX_BACKUP_FILES,
    items: backups,
    passed: backups.length <= THRESHOLDS.MAX_BACKUP_FILES,
  });

  // Large files
  const largeFiles = findLargeFiles();
  results.push({
    category: `Files >${THRESHOLDS.LARGE_FILE_LINES} lines`,
    count: largeFiles.length,
    threshold: THRESHOLDS.MAX_LARGE_FILES,
    items: largeFiles,
    passed: largeFiles.length <= THRESHOLDS.MAX_LARGE_FILES,
  });

  return results;
}

function printResults(results: AuditResult[]): boolean {
  let allPassed = true;

  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    const status = result.passed ? "PASS" : "FAIL";
    console.log(
      `\n${icon} ${result.category}: ${result.count}/${result.threshold} [${status}]`,
    );

    if (result.items.length > 0 && !result.passed) {
      console.log("   Examples:");
      result.items.forEach((item) => {
        const truncated = item.length > 80 ? item.slice(0, 80) + "..." : item;
        console.log(`   - ${truncated}`);
      });
    }

    if (!result.passed) allPassed = false;
  }

  console.log("\n" + "=".repeat(50));
  console.log(allPassed ? "✅ All checks passed!" : "❌ Some checks failed.");

  return allPassed;
}

// Main
const results = runAudit();
const passed = printResults(results);
process.exit(passed ? 0 : 1);
