// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
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
  executable(
    'bin/git',
    'if [ "$1" = diff ]; then echo apps/web/src/lib/safety/filter.ts; else printf "1234567 unique commit\\n"; fi',
  );
  executable(
    'bin/sysctl',
    'if [ "$2" = hw.logicalcpu ]; then echo 8; else echo "{ 0.1 0.1 0.1 }"; fi',
  );
  executable(
    'bin/npx',
    `if [ "$1" != vitest ]; then echo debt >> "$CALLS"; exit 0; fi
printf '%s\\n' "$*" >> "$CALLS"
echo "EARLY_ASSERTION_DIAGNOSTIC"
for ((i=1; i<=100; i++)); do echo "unit output $i"; done
exit "$UNIT_EXIT"`,
  );
  executable('bin/npm', 'test "$2" = i18n:check');
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
    calls: existsSync(join(fixture, 'calls'))
      ? readFileSync(join(fixture, 'calls'), 'utf8').trim().split('\n')
      : [],
    logs: readdirSync(join(fixture, 'logs')),
  };
}

describe('pre-push unit diagnostics', () => {
  it.each([7, 137])('retains full diagnostics and blocks later checks on exit %i', (exit) => {
    const result = run(exit);
    expect(result.status).toBe(exit);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]).toMatch(/^vitest related .*filter\.ts --run/);
    expect(result.logs).toHaveLength(1);
    const log = join(fixture, 'logs', result.logs[0]);
    expect(result.output).toContain(`Full unit test output: ${log}`);
    expect(readFileSync(log, 'utf8')).toContain('EARLY_ASSERTION_DIAGNOSTIC');
    expect(statSync(log).mode & 0o777).toBe(0o600);
  });

  it('cleans successful output and runs the remaining checks without repeating units', () => {
    const result = run(0);
    expect(result.status).toBe(0);
    expect(result.calls[0]).toMatch(/^vitest related .*filter\.ts --run/);
    expect(result.calls.slice(1)).toEqual(['debt', 'vercel']);
    expect(result.output).toContain('unit output 100');
    expect(result.output).not.toContain('EARLY_ASSERTION_DIAGNOSTIC');
    expect(result.logs).toEqual([]);
  });

  it('keeps the complete suite in cloud CI even when the machine is overloaded', () => {
    executable(
      'bin/sysctl',
      'if [ "$2" = hw.logicalcpu ]; then echo 8; else echo "{ 999 999 999 }"; fi',
    );
    const result = run(7);
    expect(result.status).toBe(7);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]).toMatch(/^vitest related .*filter\.ts --run/);
    expect(result.output).toContain('Complete unit suite is mandatory in CI');
  });

  it('refuses to select tests without the integration base', () => {
    executable(
      'bin/git',
      'if [ "$1" = rev-parse ]; then exit 1; fi; printf "1234567 unique commit\\n"',
    );
    const result = run(0);
    expect(result.status).toBe(1);
    expect(result.output).toContain('fetch origin/main before pushing');
    expect(result.calls).toEqual([]);
  });

  describe('test selection by .test-critical', () => {
    function declare(changed: string) {
      mkdirSync(join(fixture, 'scripts/test-rules'));
      copyFileSync(
        join(root, 'scripts/test-rules/critical.mjs'),
        join(fixture, 'scripts/test-rules/critical.mjs'),
      );
      writeFileSync(join(fixture, '.test-critical'), 'apps/web/src/lib/safety/**  # safety\n');
      executable(
        'bin/git',
        `if [ "$1" = diff ]; then printf '${changed}\\n'; else printf "1234567 unique commit\\n"; fi`,
      );
    }

    it('runs only related tests when no critical path changed', () => {
      declare('apps/web/src/lib/utils/format.ts');
      const result = run(0);
      expect(result.status).toBe(0);
      expect(result.output).toContain('running tests related to 1 changed file(s)');
      expect(result.calls[0]).toMatch(
        /^vitest related .*apps\/web\/src\/lib\/utils\/format\.ts --run/,
      );
      expect(result.calls).not.toContain('run test:unit -- --reporter=dot --maxWorkers=2');
    });

    it('keeps critical-path full coverage mandatory in cloud CI, not on the Mac', () => {
      declare('apps/web/src/lib/safety/filter.ts');
      const result = run(0);
      expect(result.output).toContain('Complete unit suite is mandatory in CI');
      expect(result.calls[0]).toMatch(/^vitest related .*filter\.ts --run/);
      expect(result.calls).not.toContain('run test:unit -- --reporter=dot --maxWorkers=2');
    });
  });
});
