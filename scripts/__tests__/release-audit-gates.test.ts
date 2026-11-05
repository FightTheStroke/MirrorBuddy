// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';
import { policyTestDatabaseEnabled } from '../../apps/web/src/test/policy-test-environment';
import { browserProgress } from '../lib/release-evidence-progress.mjs';

const script = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

describe('private native browser progress', () => {
  it('reports the last completed source position without exposing titles or diagnostic data', () => {
    const text = [
      'PRIVATE_ENVIRONMENT_VALUE',
      '  ✓  1 [chromium] › a.spec.ts:7:2 › PRIVATE_TITLE (1.0s)',
      '\u001b[31m  ✘  3 [a11y] › nested/b.spec.ts:19:4 › PRIVATE_EMAIL\u001b[0m',
      'PRIVATE_ERROR_AND_TOKEN',
    ].join('\n');
    expect(
      browserProgress(text, ['apps/web/e2e/nested/b.spec.ts', 'apps/web/e2e/a.spec.ts']),
    ).toEqual({ completed: 3, file: 2, line: 19 });
  });
  it('does not trust an untracked source path or an incomplete reporter line', () => {
    expect(
      browserProgress('  ✓  9 [chromium] › ../../private.spec.ts:42:1 › PRIVATE_TITLE', [
        'apps/web/e2e/a.spec.ts',
      ]),
    ).toEqual({ completed: 9, file: 0, line: 0 });
    expect(browserProgress('  ✓  4 [chromium] › a.spec.ts:7', [])).toEqual({
      completed: 0,
      file: 0,
      line: 0,
    });
  });
  it('emits only numeric progress while the private browser log is still being written', () => {
    const directory = mkdtempSync(join(tmpdir(), 'native-private-progress-'));
    try {
      writeFileSync(join(directory, 'format.json'), '{"format":"mirrorbuddy-native-release-v1"}');
      writeFileSync(
        join(directory, 'e2e.log'),
        '  ✓  1 [chromium] › production-smoke/03-chat.spec.ts:7:2 › PRIVATE_TITLE\nPRIVATE_TOKEN',
        { mode: 0o600 },
      );
      const result = spawnSync(
        process.execPath,
        [new URL('../lib/release-evidence-progress.mjs', import.meta.url).pathname, directory],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toMatch(
        /^__NATIVE_PROGRESS__ kind=3 bytes=\d+ completed=1 file=[1-9]\d* line=7\n$/,
      );
      expect(result.stdout).not.toContain('PRIVATE');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it.each([0, 42])('preserves release gate exit code %i while reporting progress', (code) => {
    const workflow = parse(
      readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
    );
    const command = z
      .object({ name: z.literal('Run native release gate'), run: z.string() })
      .parse(
        workflow.jobs['release-validation'].steps.find(
          (step: { name?: string }) => step.name === 'Run native release gate',
        ),
      ).run;
    const result = spawnSync(
      'bash',
      [
        '-e',
        '-c',
        `npm() { return ${code}; }\nnode() { return 0; }\nsleep() { return 0; }\n${command}`,
      ],
      { encoding: 'utf8', timeout: 5000 },
    );
    expect(result.status).toBe(code);
  });
});

describe('release audit checks the build that can actually ship', () => {
  it('lets native discovery collect the real database suites using one isolated target', () => {
    const workflow = parse(
      readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
    );
    const environment = z
      .object({
        DATABASE_URL: z.string(),
        TEST_DATABASE_URL: z.string(),
        DEV_DATABASE_URL: z.string(),
      })
      .parse(workflow?.jobs?.['release-validation']?.env);
    expect(policyTestDatabaseEnabled(environment)).toBe(true);
  });
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
