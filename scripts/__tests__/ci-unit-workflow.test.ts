// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const workflow = readFileSync(join(repo, '.github/workflows/ci.yml'), 'utf8');
const roots: string[] = [];
const job = (id: string) =>
  workflow.match(new RegExp(`^  ${id}:\\n[\\s\\S]*?(?=^  [\\w-]+:|$(?![\\s\\S]))`, 'm'))?.[0] ?? '';

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('native two-shard unit workflow', () => {
  it('runs the unchanged suite twice with native partitioning and explicit blob destinations', () => {
    const shard = job('unit-tests-shard');
    expect(shard).toContain('fail-fast: false');
    expect(shard).toContain('shard: [1, 2]');
    expect(shard).toContain('timeout-minutes: 15');
    expect(shard).toContain('npm run test:unit -- --coverage --reporter=default --reporter=blob');
    expect(shard).toContain('--coverage.reporter=json');
    expect(shard).toContain('--shard=${{ matrix.shard }}/2');
    expect(shard).toContain(
      '--outputFile.blob=${{ github.workspace }}/.vitest-reports/shard-${{ matrix.shard }}.json',
    );
    for (const metric of ['lines', 'branches', 'functions', 'statements']) {
      expect(shard).toContain(`--coverage.thresholds.${metric}=0`);
    }
    expect(shard).not.toMatch(/--(?:exclude|retry|isolate|no-isolate|testNamePattern)/);
    expect(shard).toContain('name: unit-blob-${{ matrix.shard }}');
    expect(shard).toContain('include-hidden-files: true');
    expect(shard).toContain('if-no-files-found: error');
    expect(shard).not.toContain('--reporter=json');
  });

  it('preserves the mandatory aggregate, native thresholds, monitoring and reports', () => {
    const aggregate = job('unit-tests');
    expect(aggregate).toContain('name: Unit Tests\n');
    expect(aggregate).toContain('needs: [unit-tests-shard]');
    expect(aggregate).toContain('if: always()');
    expect(aggregate).toContain('timeout-minutes: 10');
    expect(aggregate).toContain("needs.unit-tests-shard.result != 'success'");
    expect(aggregate).toContain('exit 1');
    expect(aggregate).toContain('pattern: unit-blob-*');
    expect(aggregate).toContain('merge-multiple: true');
    expect(aggregate).toContain('path: .vitest-reports');
    expect(aggregate).toContain('node scripts/ci-unit-validate.mjs .vitest-reports');
    expect(aggregate).toContain(
      'npm run test:unit -- --merge-reports=.vitest-reports --coverage --reporter=default --reporter=json',
    );
    expect(aggregate).not.toContain('--coverage.thresholds');
    expect(aggregate).not.toContain('--coverage.reporter');
    expect(aggregate).toContain('BASELINE=3');
    expect(aggregate).toContain('name: coverage-report');
    expect(aggregate).toContain('path: apps/web/coverage/');
    expect(aggregate).toContain('retention-days: 30');
    for (const section of [aggregate, job('unit-tests-shard')]) {
      expect(section).toContain('runs-on: ubuntu-latest');
      expect(section).toContain('actions/checkout@v4');
      expect(section).not.toContain('working-directory:');
    }
  });
});

describe('blob input validation fails closed', () => {
  const validate = (files: string[], directory = true) => {
    const root = mkdtempSync(join(tmpdir(), 'ci-unit-input-'));
    roots.push(root);
    const reports = join(root, 'reports');
    if (directory) mkdirSync(reports);
    for (const file of files) writeFileSync(join(reports, file), '{}');
    return spawnSync(process.execPath, [join(repo, 'scripts/ci-unit-validate.mjs'), reports], {
      encoding: 'utf8',
    });
  };

  it('accepts exactly the two expected reports without interpreting their private format', () => {
    expect(validate(['shard-1.json', 'shard-2.json']).status).toBe(0);
  });

  it.each([
    { files: [] },
    { files: ['shard-1.json'] },
    { files: ['shard-2.json'] },
    { files: ['shard-1.json', 'shard-2.json', 'shard-3.json'] },
  ])('rejects missing or extra reports: $files', ({ files }) => {
    const result = validate(files);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Expected exactly shard-1.json and shard-2.json');
  });

  it('rejects a missing directory and missing argument explicitly', () => {
    expect(validate([], false).stderr).toContain('Unit blob validation failed');
    const result = spawnSync(process.execPath, [join(repo, 'scripts/ci-unit-validate.mjs')], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage:');
  });

  it.each(['reports', 'report directory with spaces', 'reports;not-a-command'])(
    'reads exactly the requested relative or absolute directory: %s',
    (name) => {
      const root = mkdtempSync(join(tmpdir(), 'ci-unit-path-'));
      roots.push(root);
      const directory = join(root, name);
      mkdirSync(directory);
      for (const shard of ['shard-1.json', 'shard-2.json']) {
        writeFileSync(join(directory, shard), '{}');
      }
      // Decoy files in the caller's directory must not be used as report input.
      writeFileSync(join(root, 'shard-1.json'), '{}');
      for (const argument of [name, directory]) {
        const result = spawnSync(
          process.execPath,
          [join(repo, 'scripts/ci-unit-validate.mjs'), argument],
          { cwd: root, encoding: 'utf8' },
        );
        expect(result.status, result.stderr).toBe(0);
      }
    },
  );

  it.each(['directory', 'symlink'])('rejects a shard that is a %s, not a regular file', (kind) => {
    const root = mkdtempSync(join(tmpdir(), 'ci-unit-shape-'));
    roots.push(root);
    writeFileSync(join(root, 'shard-1.json'), '{}');
    if (kind === 'directory') mkdirSync(join(root, 'shard-2.json'));
    else symlinkSync(join(root, 'shard-1.json'), join(root, 'shard-2.json'));
    const result = spawnSync(process.execPath, [join(repo, 'scripts/ci-unit-validate.mjs'), root], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Expected exactly shard-1.json and shard-2.json');
  });

  it.each([[''], ['reports', 'extra'], ['file:///reports']])(
    'rejects invalid CLI input without a success message: %j',
    (...args) => {
      const result = spawnSync(
        process.execPath,
        [join(repo, 'scripts/ci-unit-validate.mjs'), ...args],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Unit blob validation failed:');
      expect(result.stdout).not.toContain('Both unit shard blobs present');
    },
  );

  it('rejects a report filename passed instead of its directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'ci-unit-file-'));
    roots.push(root);
    const file = join(root, 'shard-1.json');
    writeFileSync(file, '{}');
    const result = spawnSync(process.execPath, [join(repo, 'scripts/ci-unit-validate.mjs'), file], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unit blob validation failed:');
  });
});
