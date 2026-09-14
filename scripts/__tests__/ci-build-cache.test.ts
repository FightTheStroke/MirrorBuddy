// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

interface Step {
  name?: string;
  run?: string;
  with?: { path?: string; 'include-hidden-files'?: boolean };
}

const workflow = YAML.parse(
  readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf8'),
) as { jobs: { build: { steps: Step[] } } };
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Next build preparation preserves the cache until the action saves it', () => {
  it('keeps real cache files while preparing the standalone artifact', () => {
    const root = mkdtempSync(join(tmpdir(), 'ci-next-cache-'));
    roots.push(root);
    for (const directory of [
      'apps/web/.next/cache',
      'apps/web/.next/static',
      'apps/web/.next/standalone/apps/web/.next',
      'apps/web/public',
    ]) {
      mkdirSync(join(root, directory), { recursive: true });
    }
    writeFileSync(join(root, 'apps/web/.next/cache/compiler-entry'), 'reusable build work');
    writeFileSync(join(root, 'apps/web/.next/static/chunk.js'), 'static output');
    writeFileSync(join(root, 'apps/web/public/icon.svg'), '<svg/>');
    const prepare = workflow.jobs.build.steps.find(
      (step) => step.name === 'Verify and prepare build output',
    )?.run;
    if (!prepare) throw new Error('Missing build preparation step');
    const result = spawnSync(
      'bash',
      ['-e', '-o', 'pipefail', '-c', prepare],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 15000,
      },
      20000,
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(existsSync(join(root, 'apps/web/.next/cache/compiler-entry'))).toBe(true);
    expect(existsSync(join(root, 'apps/web/.next/standalone/apps/web/.next/static/chunk.js'))).toBe(
      true,
    );
    expect(existsSync(join(root, 'apps/web/.next/standalone/apps/web/public/icon.svg'))).toBe(true);
  });

  it('excludes cache data from transport without excluding application output', () => {
    const upload = workflow.jobs.build.steps.find((step) => step.name === 'Upload build artifacts');
    expect(upload?.with?.path?.trim().split('\n')).toEqual([
      'apps/web/.next',
      '!apps/web/.next/cache/**',
    ]);
    expect(upload?.with?.['include-hidden-files']).toBe(true);
  });
});
