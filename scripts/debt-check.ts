#!/usr/bin/env npx tsx
/**
 * Technical Debt Audit Script
 *
 * Checks for common debt indicators:
 * - TODO/FIXME comments
 * - @deprecated usage
 * - Backup files (.bak, .old, .orig)
 * - Production source files (>500 lines), excluding colocated and directory tests
 *
 * Usage: npm run debt:check
 * Exit code: 0 = pass, 1 = thresholds exceeded
 */

import {
  backupFiles,
  commentLocations,
  isTestFile,
  lineCount,
  sourceFiles,
  sourceFile,
} from './lib/source-inventory';

const ROOT = process.cwd();

// Thresholds - adjust as needed
const THRESHOLDS = {
  MAX_MARKERS: 10, // Max technical debt markers (was MAX_TODO)
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

function runAudit(): AuditResult[] {
  if (!process.argv.includes('--summary')) {
    console.log('🔍 Technical Debt Audit\n');
    console.log('='.repeat(50));
  }

  const results: AuditResult[] = [];
  const markers: string[] = [];
  const deprecated: string[] = [];
  const largeFiles: string[] = [];
  for (const file of sourceFiles(ROOT)) {
    const source = sourceFile(ROOT, file);
    markers.push(...commentLocations(source, /\b(?:TODO|FIXME)\b/));
    deprecated.push(...commentLocations(source, /@deprecated\b/));
    const lines = lineCount(source.text);
    if (!isTestFile(file) && lines > THRESHOLDS.LARGE_FILE_LINES) {
      largeFiles.push(`${file} (${lines} lines)`);
    }
  }

  results.push({
    category: 'TODO/FIXME comments',
    count: markers.length,
    threshold: THRESHOLDS.MAX_MARKERS,
    items: markers.slice(0, 5),
    passed: markers.length <= THRESHOLDS.MAX_MARKERS,
  });

  results.push({
    category: '@deprecated usage',
    count: deprecated.length,
    threshold: THRESHOLDS.MAX_DEPRECATED,
    items: deprecated.slice(0, 5),
    passed: deprecated.length <= THRESHOLDS.MAX_DEPRECATED,
  });

  const backups = backupFiles(ROOT);
  results.push({
    category: 'Backup files',
    count: backups.length,
    threshold: THRESHOLDS.MAX_BACKUP_FILES,
    items: backups,
    passed: backups.length <= THRESHOLDS.MAX_BACKUP_FILES,
  });

  results.push({
    category: `Files >${THRESHOLDS.LARGE_FILE_LINES} lines`,
    count: largeFiles.length,
    threshold: THRESHOLDS.MAX_LARGE_FILES,
    items: largeFiles.slice(0, 10),
    passed: largeFiles.length <= THRESHOLDS.MAX_LARGE_FILES,
  });

  return results;
}

function printResults(results: AuditResult[]): boolean {
  const summaryMode = process.argv.includes('--summary');
  let allPassed = true;

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    const icon = result.passed ? '✅' : '❌';
    console.log(
      `${summaryMode ? '' : '\n'}${icon} ${result.category}: ${result.count}/${result.threshold} [${status}]`,
    );

    if (!summaryMode && result.items.length > 0 && !result.passed) {
      console.log('   Examples:');
      result.items.forEach((item) => {
        const truncated = item.length > 80 ? item.slice(0, 80) + '...' : item;
        console.log(`   - ${truncated}`);
      });
    }

    if (!result.passed) allPassed = false;
  }

  if (!summaryMode) console.log('\n' + '='.repeat(50));
  console.log(allPassed ? '✅ All checks passed!' : '❌ Some checks failed.');

  return allPassed;
}

try {
  process.exitCode = printResults(runAudit()) ? 0 : 1;
} catch (error) {
  console.error(
    'Debt source scan failed:',
    error instanceof Error ? error.message : 'unknown error',
  );
  process.exitCode = 1;
}
