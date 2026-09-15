// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const roots: string[] = [];
function check(message: string, status = 0) {
  const directory = mkdtempSync(join(tmpdir(), 'mb-ci-warning-'));
  roots.push(directory);
  const result = spawnSync(
    'bash',
    [
      '-c',
      'set -euo pipefail; source "$1"; RESULTS=""; ERRORS=0; WARNINGS=0; run_logged Build bash -c \'printf "%s\\n" "$1"; exit "$2"\' fixture "$2" "$3"; printf "%s" "$RESULTS"; exit "$ERRORS"',
      'fixture',
      join(repository, 'scripts/lib/ci-summary-diagnostics.sh'),
      message,
      String(status),
    ],
    { encoding: 'utf8', env: { ...process.env, TMPDIR: directory } },
  );
  return { directory, result };
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
describe('CI diagnostic retention', () => {
  it('retains full private warning context without failing a successful build', () => {
    const { result } = check('Warning: Parsing CSS source code failed\n  selector context');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[WARN] Build (1 warnings)');
    const log = result.stdout.match(/Log: (.+)/)?.[1];
    expect(log).toBeDefined();
    if (!log) throw new Error('Expected a retained warning log');
    expect(readFileSync(log, 'utf8')).toContain('selector context');
    expect(statSync(log).mode & 0o077).toBe(0);
  });
  it('still removes successful logs without warnings', () => {
    const { result, directory } = check('Build successful');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[PASS] Build');
    expect(readdirSync(directory)).toEqual([]);
  });
  it('retains failures and their failing status', () => {
    const { result } = check('Missing required source', 2);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[FAIL] Build (exit 2)');
    expect(result.stdout).toContain('Log:');
  });
});
