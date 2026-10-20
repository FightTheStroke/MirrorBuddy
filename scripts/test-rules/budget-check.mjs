// The .test-budget ratchet (roberdan-os docs/testing-template.md section 7 check 1).
// usage: node scripts/test-rules/budget-check.mjs [--wall <full-suite seconds>]
// Fails when the unit test-file count (or the full-suite wall time, when given) is more than 10% above the
// record in .test-budget and the env TEST_BUDGET_NOTE has no "Test-budget: <why>" line.
// Counted files are the ones apps/web/vitest.config.ts includes. Run by the nightly workflow.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const INCLUDED = [
  /^apps\/web\/src\/.*\.(test\.tsx?|spec\.ts)$/,
  /^scripts\/__tests__\/.*\.test\.ts$/,
];

export function countTestFiles(paths) {
  return paths.filter((path) => INCLUDED.some((pattern) => pattern.test(path))).length;
}

export function record(text, key) {
  return Number(new RegExp(`^${key}=(\\d+)`, 'm').exec(text)?.[1] ?? 0);
}

export function ceiling(recorded) {
  return Math.floor(recorded * 1.1);
}

export function evaluate({ text, files, wall, note }) {
  const problems = [];
  if (files > ceiling(record(text, 'test_files'))) {
    problems.push(`test files ${files} > ceiling ${ceiling(record(text, 'test_files'))} (record ${record(text, 'test_files')} +10%)`);
  }
  const wallRecord = record(text, 'wall_seconds');
  if (wall !== undefined && wallRecord > 0 && wall > ceiling(wallRecord)) {
    problems.push(`full suite ${wall}s > ceiling ${ceiling(wallRecord)}s (record ${wallRecord}s +10%)`);
  }
  const justified = /^Test-budget:\s*\S+/m.test(note ?? '');
  return { problems, ok: problems.length === 0 || justified, justified };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const wallIndex = args.indexOf('--wall');
  const wall = wallIndex >= 0 ? Number(args[wallIndex + 1]) : undefined;
  const text = readFileSync('.test-budget', 'utf8');
  const files = countTestFiles(execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n'));
  const result = evaluate({ text, files, wall, note: process.env.TEST_BUDGET_NOTE });
  console.log(`test files: ${files} (record ${record(text, 'test_files')}); full suite: ${wall ?? 'n/a'}s (record ${record(text, 'wall_seconds')}s)`);
  if (result.problems.length > 0 && result.justified) console.log(`over the ceiling, justified by the Test-budget line:\n${result.problems.join('\n')}`);
  if (!result.ok) {
    console.error(`.test-budget exceeded without a "Test-budget: <why>" line (env TEST_BUDGET_NOTE):\n${result.problems.join('\n')}`);
    process.exit(1);
  }
}
