/**
 * Runs knip and extracts the list of unreachable files.
 *
 * knip understands this repo's real entry points (Next.js App Router conventions,
 * config files, workspaces) via its plugins and knip.json; the escape hatch for
 * the entry points it still cannot see statically is the reachability manifest.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { REPO_ROOT } from './config';

const KNIP_BIN = path.join(REPO_ROOT, 'node_modules', '.bin', 'knip');

interface KnipJson {
  files: string[];
}

/**
 * knip loads config files by importing them; apps/web/playwright.config.ts throws
 * unless TEST_DATABASE_URL is set. A throwaway value keeps the analyser running —
 * knip never connects to it.
 */
function knipEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    TEST_DATABASE_URL:
      process.env.TEST_DATABASE_URL ||
      'postgresql://reachability@localhost:5432/reachability_unused',
  };
}

/** Some globally-installed tooling prints a banner before knip's JSON; skip it. */
function extractJson(stdout: string): KnipJson {
  const match = stdout.match(/^\{.*"files".*$/m);
  if (!match) {
    throw new Error('knip did not produce a JSON report with a "files" array');
  }
  return JSON.parse(match[0]) as KnipJson;
}

export function runKnipFiles(): string[] {
  const result = spawnSync(
    KNIP_BIN,
    ['--include', 'files', '--reporter', 'json', '--no-progress'],
    { cwd: REPO_ROOT, env: knipEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  if (result.error) {
    throw new Error(`Failed to run knip: ${result.error.message}`);
  }
  // knip exits non-zero when it finds unused files; that is the expected path.
  if (typeof result.stdout !== 'string' || result.stdout.length === 0) {
    throw new Error(`knip produced no output (exit ${result.status}): ${result.stderr}`);
  }

  return extractJson(result.stdout).files;
}
