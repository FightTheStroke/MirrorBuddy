#!/usr/bin/env tsx
/**
 * Reachability guard — the systemic cure for the "273 disconnected files".
 *
 * A production file under apps/web/src is *reachable* when knip can trace it from
 * a real entry point. The guard fails a pull request that:
 *   (a) adds a new unreachable production file, or
 *   (b) edits a file already on the baseline that is still unreachable.
 * Resolve either by one of three documented moves: wire it in, delete it, or
 * declare its non-static consumer in scripts/reachability/reachability-manifest.json.
 *
 * The baseline (scripts/reachability/reachability-baseline.txt) is the tolerated
 * backlog. It must shrink, never silently grow: new entries only ever land via the
 * deliberate `--update-baseline` command, which produces a reviewable diff.
 */

import fs from 'fs';
import { spawnSync } from 'child_process';
import {
  analyzeReachability,
  loadManifestFiles,
  type ManifestEntry,
  type ReachabilityResult,
} from './reachability/core';
import { BASELINE_PATH, MANIFEST_PATH, scopeUnreachable } from './reachability/config';
import { runKnipFiles } from './reachability/knip-runner';

function readBaseline(): string[] {
  if (!fs.existsSync(BASELINE_PATH)) return [];
  return fs
    .readFileSync(BASELINE_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function readManifest(): string[] {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as {
    entries?: ManifestEntry[];
  };
  return loadManifestFiles(parsed.entries ?? []);
}

/** Files added or modified relative to the PR base; empty when it cannot be resolved. */
function changedFiles(): string[] {
  const base = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : 'origin/main';
  const diff = spawnSync('git', ['diff', '--name-only', '--diff-filter=AM', `${base}...HEAD`], {
    encoding: 'utf8',
  });
  if (diff.status !== 0 || typeof diff.stdout !== 'string') return [];
  return diff.stdout
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
}

function writeBaseline(files: string[]): void {
  const header = [
    '# Reachability baseline — production files under apps/web/src that knip cannot',
    '# reach from any entry point. This is the backlog to shrink, NOT a regression.',
    '# Managed by scripts/check-reachability.ts. Growth requires --update-baseline',
    '# and must be justified in review. See docs/ci/reachability-check.md.',
  ].join('\n');
  fs.writeFileSync(BASELINE_PATH, `${header}\n${[...files].sort().join('\n')}\n`);
}

function printResult(result: ReachabilityResult, editModeFail: boolean): void {
  const list = (label: string, files: string[]) => {
    if (files.length === 0) return;
    console.log(`\n${label} (${files.length}):`);
    for (const f of files) console.log(`  ${f}`);
  };

  list('❌ Newly unreachable production files', result.newlyUnreachable);
  list(
    `${editModeFail ? '❌' : '⚠️'} Edited baseline files that are still unreachable`,
    result.editedStillUnreachable,
  );
  list('⚠️  Baseline entries that are now reachable (run --update-baseline)', result.staleBaseline);
  list('ℹ️  Manifest entries that are already reachable (prune them)', result.redundantDeclared);

  if (result.newlyUnreachable.length > 0 || result.editedStillUnreachable.length > 0) {
    console.log(
      '\nResolve each file one of three ways: wire it into a real entry point,\n' +
        'delete it, or declare its non-static consumer in\n' +
        'scripts/reachability/reachability-manifest.json. See docs/ci/reachability-check.md.',
    );
  }
}

function main(): void {
  const update = process.argv.includes('--update-baseline');
  const editModeFail = (process.env.REACHABILITY_EDIT_MODE ?? 'fail') !== 'warn';

  const declared = readManifest();
  const declaredSet = new Set(declared);
  const unreachable = scopeUnreachable(runKnipFiles());

  if (update) {
    const next = unreachable.filter((f) => !declaredSet.has(f));
    writeBaseline(next);
    console.log(`Baseline updated: ${next.length} unreachable production files.`);
    return;
  }

  const result = analyzeReachability({
    unreachable,
    baseline: readBaseline(),
    declared,
    changedFiles: changedFiles(),
    editModeFail,
  });

  console.log(
    `=== Reachability guard ===\n` +
      `unreachable (scoped): ${unreachable.length} · baseline: ${readBaseline().length} · ` +
      `declared: ${declared.length}`,
  );
  printResult(result, editModeFail);

  if (result.ok) {
    console.log(
      `\n✅ PASS — no new unreachable production files` +
        (result.warningCount ? ` (${result.warningCount} warning(s))` : ''),
    );
    return;
  }
  console.log(`\n❌ FAIL — ${result.errorCount} blocking issue(s).`);
  process.exit(1);
}

main();
