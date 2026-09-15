// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const script = join(repository, 'scripts/check-source-quality.ts');
const cli = join(repository, 'node_modules/tsx/dist/cli.mjs');
const roots: string[] = [];

function check(text: string, mode = 'hygiene', missing = false) {
  const root = mkdtempSync(join(tmpdir(), 'mb-source-quality-'));
  roots.push(root);
  mkdirSync(join(root, 'packages/shared/src'), { recursive: true });
  writeFileSync(join(root, 'packages/shared/src/example.ts'), text);
  if (!missing) {
    mkdirSync(join(root, 'apps/web/src'), { recursive: true });
    writeFileSync(join(root, 'apps/web/src/example.ts'), 'export {};\n');
  }
  return spawnSync(process.execPath, [cli, script, mode], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('release source quality', () => {
  it('finds real console calls in shared packages', () => {
    const result = check('console.log("synthetic-private-canary");');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('CONSOLE_COUNT=1');
    expect(result.stdout).not.toContain('synthetic-private-canary');
  });
  it('does not count educational strings or documentation examples as executable calls', () => {
    const result = check('const title = "METODO: TODO: console.log("; // console.log("example")');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('TODO_COUNT=0');
    expect(result.stdout).toContain('CONSOLE_COUNT=0');
  });
  it('detects technical debt only in actual comments', () => {
    const result = check('const lesson = "TODO:"; // FIXME: handle failure');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('TODO_COUNT=1');
  });
  it('detects unsafe types structurally, including multiline annotations', () => {
    const result = check('let value:\n any;', 'rigor');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('ANY_TYPE:packages/shared/src/example.ts:2');
  });
  it('does not count unsafe-type and suppression examples in strings', () => {
    expect(check('const sample = ": any as any @ts-ignore";', 'rigor').status).toBe(0);
  });
  it('rejects a real suppression comment', () => {
    const result = check('// @ts-ignore\nconst value: string = 1;', 'rigor');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('TS_IGNORE:packages/shared/src/example.ts:1');
  });
  it('fails explicitly when source inspection cannot run', () => {
    const result = check('export {};', 'hygiene', true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Source quality scan failed');
    expect(result.stdout).not.toContain('COUNT=0');
  });
  it('rejects unknown check modes', () => {
    expect(check('export {};', 'misspelled').status).toBe(1);
  });
});
