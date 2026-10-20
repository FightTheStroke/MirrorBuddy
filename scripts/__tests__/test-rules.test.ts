// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

async function load(name: string) {
  return import(/* @vite-ignore */ join(root, 'scripts/test-rules', name));
}

describe('.test-critical declaration', () => {
  it('matches ** across folders and * within one folder', async () => {
    const { parseCritical, criticalMatches } = await load('critical.mjs');
    const entries = parseCritical(
      'a/**  # deep\nb/*/package.json  # one level\nc.ts  # exact\n# comment\n',
    );
    const hit = (file: string) => criticalMatches(entries, [file]).length;
    expect(hit('a/x/y/z.ts')).toBe(1);
    expect(hit('b/pkg/package.json')).toBe(1);
    expect(hit('b/pkg/deep/package.json')).toBe(0);
    expect(hit('c.ts')).toBe(1);
    expect(hit('cxts')).toBe(0);
  });

  it('declares only globs that match real files, with a reason each', async () => {
    const { parseCritical } = await load('critical.mjs');
    const text = readFileSync(join(root, '.test-critical'), 'utf8');
    const entries = parseCritical(text);
    expect(entries.length).toBeGreaterThan(10);
    for (const entry of entries) expect(entry.reason, entry.glob).not.toBe('');
    const tracked = spawnSync('git', ['ls-files'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    }).stdout.split('\n');
    for (const entry of entries) {
      expect(
        tracked.some((file) => entry.pattern.test(file)),
        entry.glob,
      ).toBe(true);
    }
  });

  it('treats a repo without .test-critical as entirely critical', () => {
    const dir = mkdtempSync(join(tmpdir(), 'critical-none-'));
    try {
      const result = spawnSync('node', [join(root, 'scripts/test-rules/critical.mjs')], {
        cwd: dir,
        encoding: 'utf8',
      });
      expect(result.stdout).toContain('critical=true');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('.test-budget ratchet', () => {
  const text = 'wall_seconds=100\ntest_files=100\n';

  it('stays green within +10% and red above it without a reason', async () => {
    const { evaluate } = await load('budget-check.mjs');
    expect(evaluate({ text, files: 110, wall: 110 }).ok).toBe(true);
    const over = evaluate({ text, files: 111, wall: 111 });
    expect(over.ok).toBe(false);
    expect(over.problems).toHaveLength(2);
  });

  it('accepts an overrun only with a Test-budget line', async () => {
    const { evaluate } = await load('budget-check.mjs');
    expect(evaluate({ text, files: 150, note: 'Test-budget: new module' }).ok).toBe(true);
    expect(evaluate({ text, files: 150, note: 'Test-budget:' }).ok).toBe(false);
  });

  it('counts only the files vitest includes', async () => {
    const { countTestFiles } = await load('budget-check.mjs');
    expect(
      countTestFiles([
        'apps/web/src/a.test.ts',
        'apps/web/src/b.test.tsx',
        'apps/web/e2e/c.spec.ts',
        'scripts/__tests__/d.test.ts',
        'scripts/e.ts',
      ]),
    ).toBe(3);
  });
});
