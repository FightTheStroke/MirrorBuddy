// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

describe('release audit checks the build that can actually ship', () => {
  it('checks pre-release runtime absence after building and preparing standalone', () => {
    const source = script('pre-release-check.sh');
    expect(source.indexOf('node scripts/release-audit.mjs')).toBeGreaterThan(
      source.indexOf('prepare-standalone.mjs'),
    );
  });
  it('checks brutal release runtime absence after the build and browser preparation', () => {
    const source = script('release-brutal.sh');
    expect(source.indexOf('node scripts/release-audit.mjs')).toBeGreaterThan(
      source.indexOf('npm run test >'),
    );
  });
  it.each(['pre-release-check.sh', 'release-brutal.sh'])(
    'does not hide approved-exception output or call an unscoped audit in %s',
    (name) => {
      const source = script(name);
      expect(source).toContain('cat "$');
      expect(source).not.toContain('pnpm audit');
      expect(source).not.toMatch(/Security audit passed/);
    },
  );
});

it('publishes only bounded allowlisted numeric native failure markers', () => {
  const root = mkdtempSync(join(tmpdir(), 'native-safe-diagnostic-'));
  try {
    const directory = join(root, 'attachment-release-evidence');
    mkdirSync(directory);
    writeFileSync(
      join(directory, 'policy.log'),
      [
        'private-environment-value',
        '__POLICY_FAILURE__ line=21 exit=1',
        '__POLICY_FAILURE__ line=21 exit=1 private-suffix',
        '__POLICY_FAILURE__ line=0 exit=1',
      ].join('\n'),
    );
    writeFileSync(
      join(directory, 'pre-release.log'),
      [
        'private-command-and-stderr',
        '__PRE_RELEASE_FAILURE__ criterion=11 exit=1',
        '__PRE_RELEASE_FAILURE__ criterion=6 exit=0',
        '__PRE_RELEASE_FAILURE__ criterion=6 exit=1 private-suffix',
        '__PERF_FAILURE__ criterion=9 exit=1',
        '__PERF_FAILURE__ criterion=6 exit=1 private-suffix',
        '__PERF_FAILURE__ criterion=6 exit=1',
        ...Array.from({ length: 20 }, () => '__PRE_RELEASE_FAILURE__ criterion=6 exit=1'),
      ].join('\n'),
    );
    const workflow = readFileSync(
      new URL('../../.github/workflows/ci.yml', import.meta.url),
      'utf8',
    );
    const step = workflow
      .split('      - name: Report bounded native failure diagnostics\n')[1]
      .split('      - name: Verify project health\n')[0];
    const command = step.split('        run: |\n')[1].replace(/^          /gm, '');
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', command], {
      encoding: 'utf8',
      env: { ...process.env, RUNNER_TEMP: root },
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(
      '__POLICY_FAILURE__ line=21 exit=1\n' +
        '__PERF_FAILURE__ criterion=6 exit=1\n' +
        '__PRE_RELEASE_FAILURE__ criterion=6 exit=1\n'.repeat(11),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
