// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
let fixture: string;

function executable(path: string, source: string) {
  writeFileSync(join(fixture, path), `#!/usr/bin/env bash\nset -eu\n${source}\n`, {
    mode: 0o755,
  });
}

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'pre-push-unit-output-'));
  for (const directory of ['bin', 'scripts', 'logs']) mkdirSync(join(fixture, directory));
  copyFileSync(join(root, '.husky/pre-push'), join(fixture, 'pre-push'));
  executable('bin/git', 'printf "1234567 unique commit\\n"');
  executable(
    'bin/sysctl',
    'if [ "$2" = hw.logicalcpu ]; then echo 8; else echo "{ 0.1 0.1 0.1 }"; fi',
  );
  executable('bin/npx', 'echo debt >> "$CALLS"');
  executable(
    'bin/npm',
    `if [ "$2" = i18n:check ]; then exit 0; fi
printf '%s\\n' "$*" >> "$CALLS"
echo "EARLY_ASSERTION_DIAGNOSTIC"
for ((i=1; i<=100; i++)); do echo "unit output $i"; done
exit "$UNIT_EXIT"`,
  );
  executable('scripts/env-var-audit.sh', 'exit 0');
  executable('scripts/pre-push-vercel.sh', 'echo vercel >> "$CALLS"');
});

afterEach(() => rmSync(fixture, { recursive: true, force: true }));

function run(unitExit: number) {
  const result = spawnSync('bash', ['pre-push'], {
    cwd: fixture,
    env: {
      ...process.env,
      PATH: `${join(fixture, 'bin')}:${process.env.PATH ?? ''}`,
      TMPDIR: join(fixture, 'logs'),
      CALLS: join(fixture, 'calls'),
      UNIT_EXIT: String(unitExit),
    },
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    output: result.stdout + result.stderr,
    calls: readFileSync(join(fixture, 'calls'), 'utf8').trim().split('\n'),
    logs: readdirSync(join(fixture, 'logs')),
  };
}

describe('pre-push unit diagnostics', () => {
  it.each([7, 137])('retains full diagnostics and blocks later checks on exit %i', (exit) => {
    const result = run(exit);
    expect(result.status).toBe(exit);
    expect(result.calls).toEqual(['run test:unit -- --reporter=dot --maxWorkers=2']);
    expect(result.logs).toHaveLength(1);
    const log = join(fixture, 'logs', result.logs[0]);
    expect(result.output).toContain(`Full unit test output: ${log}`);
    expect(readFileSync(log, 'utf8')).toContain('EARLY_ASSERTION_DIAGNOSTIC');
    expect(statSync(log).mode & 0o777).toBe(0o600);
  });

  it('cleans successful output and runs the remaining checks without repeating units', () => {
    const result = run(0);
    expect(result.status).toBe(0);
    expect(result.calls).toEqual([
      'run test:unit -- --reporter=dot --maxWorkers=2',
      'debt',
      'vercel',
    ]);
    expect(result.output).toContain('unit output 100');
    expect(result.output).not.toContain('EARLY_ASSERTION_DIAGNOSTIC');
    expect(result.logs).toEqual([]);
  });

  it('runs the complete unit command even when the machine is overloaded', () => {
    executable(
      'bin/sysctl',
      'if [ "$2" = hw.logicalcpu ]; then echo 8; else echo "{ 999 999 999 }"; fi',
    );
    const result = run(7);
    expect(result.status).toBe(7);
    expect(result.calls).toEqual(['run test:unit -- --reporter=dot --maxWorkers=2']);
  });
});
