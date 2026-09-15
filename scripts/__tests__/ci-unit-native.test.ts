// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(repo, 'node_modules/vitest/vitest.mjs');
const roots: string[] = [];
const metrics = ['lines', 'branches', 'functions', 'statements'];
const zeroThresholds = metrics.map((metric) => `--coverage.thresholds.${metric}=0`);

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(untestedFunctions: number) {
  const root = mkdtempSync(join(tmpdir(), 'ci-unit-native-'));
  roots.push(root);
  const app = join(root, 'apps/web');
  mkdirSync(join(app, 'src'), { recursive: true });
  symlinkSync(realpathSync(join(repo, 'node_modules')), join(root, 'node_modules'), 'dir');
  writeFileSync(
    join(app, 'vitest.config.mjs'),
    `export default {
    test: {
      environment: 'node', include: ['src/*.test.js'],
      outputFile: { json: './coverage/test-results.json' },
      coverage: {
        provider: 'v8', include: ['src/*.js'], exclude: ['src/*.test.js'],
        reporter: ['text', 'json', 'html'], reportsDirectory: './coverage',
        thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 }
      }
    }
  };`,
  );
  const functions = (count: number) =>
    Array.from({ length: count }, (_, i) => `export function fn${i}() { return ${i}; }`).join('\n');
  writeFileSync(join(app, 'src/covered.js'), functions(9));
  writeFileSync(join(app, 'src/untested.js'), functions(untestedFunctions));
  for (const shard of [1, 2]) {
    writeFileSync(
      join(app, `src/part-${shard}.test.js`),
      `
      import { it, expect } from 'vitest';
      import * as source from './covered.js';
      it('part ${shard}', () => {
        for (let i = ${shard - 1}; i < 9; i += 2) expect(source['fn' + i]()).toBe(i);
      });
    `,
    );
  }
  const run = (args: string[]) =>
    spawnSync(process.execPath, [cli, 'run', '--root', 'apps/web', '--coverage', ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, CI: 'true' },
    });
  const json = (file: string) => JSON.parse(readFileSync(join(app, 'coverage', file), 'utf8'));
  return { root, app, run, json };
}

function expectExit(result: ReturnType<typeof spawnSync>, status: number) {
  expect(result.error).toBeUndefined();
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(status);
}

describe('locked native Vitest coverage merge', () => {
  it.each([
    { untested: 1, exit: 0 },
    { untested: 10, exit: 1 },
  ])(
    'matches unsharded coverage including $untested untested functions (exit $exit)',
    ({ untested, exit }) => {
      const { root, app, run, json } = fixture(untested);
      const baseline = run(['--reporter=default', '--reporter=json']);
      expectExit(baseline, exit);
      const baselineCoverage = json('coverage-final.json');
      const baselineTests = json('test-results.json');
      const untestedPath = Object.keys(baselineCoverage).find((file) =>
        file.endsWith('/untested.js'),
      );
      expect(untestedPath).toBeDefined();
      expect(Object.values(baselineCoverage[untestedPath!].f)).toEqual(Array(untested).fill(0));

      for (const shard of [1, 2]) {
        const result = run([
          '--reporter=default',
          '--reporter=blob',
          '--coverage.reporter=json',
          `--shard=${shard}/2`,
          `--outputFile.blob=${join(root, `.vitest-reports/shard-${shard}.json`)}`,
          ...zeroThresholds,
        ]);
        expectExit(result, 0);
        expect(
          existsSync(join(root, `.vitest-reports/shard-${shard}.json`)),
          `${result.stdout}\n${result.stderr}`,
        ).toBe(true);
        expect(existsSync(join(app, 'coverage/index.html'))).toBe(false);
        expect(stripVTControlCharacters(result.stdout)).not.toContain('% Coverage report from v8');
      }
      expect(readdirSync(join(root, '.vitest-reports')).sort()).toEqual([
        'shard-1.json',
        'shard-2.json',
      ]);
      // Only blobs survive transport between CI runners, not raw coverage intermediates.
      rmSync(join(app, 'coverage'), { recursive: true, force: true });
      expectExit(
        spawnSync(
          process.execPath,
          [join(repo, 'scripts/ci-unit-validate.mjs'), '.vitest-reports'],
          { cwd: root, encoding: 'utf8' },
        ),
        0,
      );
      const merged = run([
        '--merge-reports=.vitest-reports',
        '--reporter=default',
        '--reporter=json',
      ]);
      expectExit(merged, exit);
      expect(json('coverage-final.json')).toEqual(baselineCoverage);
      const mergedTests = json('test-results.json');
      for (const key of ['numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests']) {
        expect(mergedTests[key]).toEqual(baselineTests[key]);
      }
      expect(mergedTests.numTotalTests).toBe(2);
      expect(readdirSync(join(app, 'coverage'))).toContain('index.html');
      expect(stripVTControlCharacters(merged.stdout)).toContain('% Coverage report from v8');
      if (exit === 1) {
        expect(`${merged.stdout}\n${merged.stderr}`).toContain(
          'does not meet global threshold (80%)',
        );
      } else {
        writeFileSync(join(root, '.vitest-reports/shard-2.json'), 'corrupted');
        expectExit(run(['--merge-reports=.vitest-reports', '--reporter=default']), 1);
      }
    },
    60000,
  );
});
