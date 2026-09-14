// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repository = process.cwd();
const fixtures: string[] = [];
const stub = `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$STUB_ARGUMENTS"
printf '%s\\n' "\${STUB_OUTPUT:-}"
printf '%s\\n' "\${STUB_STDERR:-}" >&2
exit "\${STUB_EXIT:-0}"
`;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'mirrorbuddy-ci-test-'));
  fixtures.push(root);
  for (const directory of ['scripts/lib', 'bin', 'logs', 'elsewhere', 'apps/web/src']) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  copyFileSync(join(repository, 'scripts/ci-summary.sh'), join(root, 'scripts/ci-summary.sh'));
  const helper = join(repository, 'scripts/lib/ci-summary-diagnostics.sh');
  if (existsSync(helper)) copyFileSync(helper, join(root, 'scripts/lib/ci-summary-diagnostics.sh'));
  writeFileSync(
    join(root, 'scripts/lib/build-lock.sh'),
    'acquire_build_lock() { :; }\nrelease_build_lock() { :; }\n',
  );
  for (const command of [
    'bin/npm',
    'bin/npx',
    'scripts/check-links.sh',
    'scripts/check-schema-drift.sh',
  ]) {
    writeFileSync(join(root, command), stub, { mode: 0o755 });
  }
  const run = (mode: string, output = '', status = 0, stderr = '', args: string[] = []) =>
    spawnSync('bash', [join(root, 'scripts/ci-summary.sh'), mode, ...args], {
      cwd: join(root, 'elsewhere'),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${join(root, 'bin')}:${process.env.PATH}`,
        TMPDIR: join(root, 'logs'),
        STUB_ARGUMENTS: join(root, 'arguments'),
        STUB_OUTPUT: output,
        STUB_STDERR: stderr,
        STUB_EXIT: String(status),
      },
    });
  return { root, run };
}

afterEach(() => {
  for (const root of fixtures.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('CI diagnostic process truth and retained evidence', () => {
  it.each([
    ['--types', 'Typecheck', 'apps/web/src/sample.ts(7,3): error TS2322: incompatible value'],
    ['--lint', 'Lint', '/project/apps/web/src/sample.ts\n  7:3  error  incompatible value'],
    ['--build', 'Build', 'Error: build unavailable'],
    ['--unit', 'Unit', '{"success":true}\nUnhandled Rejection\nError: request failed'],
    ['--links', 'Links', 'broken-link.md:7: missing target'],
    ['--reachability', 'Reachability', 'Newly unreachable: apps/web/src/sample.ts'],
    ['--i18n', 'i18n', 'missing translation'],
    ['--roster', 'roster', 'stale roster'],
    ['--migrations', 'Migrations', 'MISSING: model field'],
  ])('preserves failure output for %s', (mode, label, output) => {
    const { run } = fixture();
    const result = run(mode, output, 1);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`[FAIL] ${label}`);
    expect(result.stdout).not.toContain(`[PASS] ${label}`);
    const log = result.stdout.match(/Log: ([^\n]+)/)?.[1].trim();
    expect(log).toBeDefined();
    expect(readFileSync(log!, 'utf8')).toContain(output);
    expect(statSync(log!).mode & 0o077).toBe(0);
    if (mode === '--types') expect(result.stdout).toContain('sample.ts(7,3)');
    if (mode === '--lint') expect(result.stdout).toContain('/project/apps/web/src/sample.ts');
    if (mode === '--unit') expect(result.stdout).toContain('Unhandled Rejection');
  });

  it('retains unexpected stderr instead of an empty diagnostic', () => {
    const { run } = fixture();
    const result = run('--types', '', 7, 'unexpected compiler termination');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('unexpected compiler termination');
    const log = result.stdout.match(/Log: ([^\n]+)/)?.[1].trim();
    expect(log).toBeDefined();
    expect(readFileSync(log!, 'utf8')).toContain('unexpected compiler termination');
  });

  it('creates independent logs without overwriting a prior failure', () => {
    const { run } = fixture();
    const first = run('--types', 'first failure', 1)
      .stdout.match(/Log: ([^\n]+)/)?.[1]
      .trim();
    const second = run('--types', 'second failure', 1)
      .stdout.match(/Log: ([^\n]+)/)?.[1]
      .trim();
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
    expect(readFileSync(first!, 'utf8')).toContain('first failure');
    expect(readFileSync(second!, 'utf8')).toContain('second failure');
  });

  it('keeps successful checks successful', () => {
    const result = fixture().run('--types', 'typecheck completed');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[PASS] Typecheck');
    expect(result.stdout).not.toContain('Log:');
  });

  it.each([
    ['--lint', 'Lint', '  7:3  warning  existing warning'],
    ['--build', 'Build', 'warn existing warning'],
  ])('keeps successful %s warnings visible', (mode, label, output) => {
    const result = fixture().run(mode, output);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`[WARN] ${label} (1 warnings)`);
    expect(result.stdout).toContain('OK with 1 warning(s)');
    expect(result.stdout).not.toContain('ALL CLEAN');
  });

  it('counts each failed quick check without early termination', () => {
    const result = fixture().run('--quick', 'unexpected failure', 1);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[FAIL] Lint');
    expect(result.stdout).toContain('[FAIL] Typecheck');
    expect(result.stdout).toContain('BLOCKED: 2 step(s) failed');
  });
});

describe('actual check targets', () => {
  it('fails when the relocated source tree cannot be scanned', () => {
    const { root, run } = fixture();
    rmSync(join(root, 'apps/web/src'), { recursive: true });
    const result = run('--unsafe-queries');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[FAIL] Unsafe queries');
    expect(result.stdout).toContain('apps/web/src');
  });

  it.each(['bad.tsx', 'src/bad.tsx', 'apps/web/src/bad.tsx'])(
    'scans relocated TSX sources and honors allowlist entry %s',
    (entry) => {
      const { root, run } = fixture();
      writeFileSync(join(root, 'apps/web/src/bad.tsx'), 'client.$queryRawUnsafe(input);');
      expect(run('--unsafe-queries').status).toBe(1);
      writeFileSync(
        join(root, 'scripts/.queryraw-allowlist'),
        `# explicit existing exception\n${entry}\n`,
      );
      expect(run('--unsafe-queries').status).toBe(0);
    },
  );

  it('never treats a failed source scan as no matches', () => {
    const { root, run } = fixture();
    writeFileSync(
      join(root, 'bin/grep'),
      '#!/usr/bin/env bash\necho "scan unreadable" >&2\nexit 2\n',
      {
        mode: 0o755,
      },
    );
    const result = run('--unsafe-queries');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[FAIL] Unsafe queries');
    expect(result.stdout).toContain('scan unreadable');
  });

  it('does not extend an explicit path exception to another same-named file', () => {
    const { root, run } = fixture();
    mkdirSync(join(root, 'apps/web/src/other'));
    writeFileSync(join(root, 'apps/web/src/other/bad.ts'), 'client.$queryRawUnsafe(input);');
    writeFileSync(join(root, 'scripts/.queryraw-allowlist'), 'src/bad.ts\n');
    expect(run('--unsafe-queries').status).toBe(1);
  });

  it('preserves the legacy single-string E2E option form', () => {
    const { root, run } = fixture();
    expect(run('--e2e', '1 passed', 0, '', ['--project=chromium example.spec.ts']).status).toBe(0);
    const args = readFileSync(join(root, 'arguments'), 'utf8').trim().split('\n');
    expect(args.slice(-2)).toEqual(['--project=chromium', 'example.spec.ts']);
  });

  it.each(['--e2e', '--a11y'])('uses the application Playwright config for %s', (mode) => {
    const { root, run } = fixture();
    const result = run(mode, '1 passed', 0, '', ['--project=chromium', 'space name.spec.ts']);
    expect(result.status).toBe(0);
    const args = readFileSync(join(root, 'arguments'), 'utf8').trim().split('\n');
    expect(args).toContain('--config');
    expect(args).toContain(resolve(root, 'apps/web/playwright.config.iteration.ts'));
    if (mode === '--e2e') expect(args).toContain('space name.spec.ts');
    else expect(args).toContain('--project=a11y');
  });
});
