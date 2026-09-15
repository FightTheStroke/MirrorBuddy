// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const command = join(repository, 'node_modules/tsx/dist/cli.mjs');
const script = join(repository, 'scripts/debt-check.ts');
const roots: string[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'mb-release-debt-'));
  roots.push(root);
  mkdirSync(join(root, 'apps/web/src'), { recursive: true });
  mkdirSync(join(root, 'packages/shared/src'), { recursive: true });
  writeFileSync(join(root, 'apps/web/src/index.ts'), 'export {};\n');
  return root;
}

function check(root: string) {
  return spawnSync(process.execPath, [command, script, '--summary'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
  });
}

function source(root: string, file: string, content: string) {
  const target = join(root, file);
  mkdirSync(resolve(target, '..'), { recursive: true });
  writeFileSync(target, content);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('release debt checks inspect the real workspace', () => {
  it('rejects eleven markers in application comments', () => {
    const root = fixture();
    source(
      root,
      'apps/web/src/debt.ts',
      Array.from({ length: 11 }, (_, index) => `// TODO: issue ${index}`).join('\n'),
    );
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('11/10 [FAIL]');
  });

  it('includes shared package comments without interpreting educational strings as debt', () => {
    const root = fixture();
    source(root, 'apps/web/src/lesson.ts', 'export const title = "METODO: TODO";\n');
    source(
      root,
      'packages/shared/src/debt.ts',
      Array.from({ length: 11 }, (_, index) => `// FIXME: issue ${index}`).join('\n'),
    );
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('11/10 [FAIL]');
  });

  it('counts every oversized file before limiting displayed examples', () => {
    const root = fixture();
    for (let index = 0; index < 11; index += 1) {
      source(root, `apps/web/src/large-${index}.ts`, Array(501).fill(';').join('\n'));
      source(root, `src/large-${index}.ts`, Array(501).fill(';').join('\n'));
    }
    const result = check(root);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('11/10 [FAIL]');
  });

  it('treats directory-based and colocated tests consistently', () => {
    const root = fixture();
    const large = Array(501).fill(';').join('\n');
    for (let index = 0; index < 11; index += 1) {
      source(root, `apps/web/src/example-${index}.test.ts`, large);
      source(root, `packages/shared/src/__tests__/example-${index}.ts`, large);
    }
    const result = check(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0/10 [PASS]');
  });

  it('accepts exactly 500 lines with a final newline', () => {
    const root = fixture();
    for (let index = 0; index < 11; index += 1) {
      source(root, `apps/web/src/exact-${index}.ts`, ';\n'.repeat(500));
    }
    expect(check(root).status).toBe(0);
  });

  it('fails when the required application source root is missing', () => {
    const root = fixture();
    rmSync(join(root, 'apps/web/src'), { recursive: true });
    const result = check(root);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/source|directory/i);
  });

  it('does not traverse an external source symlink', () => {
    const root = fixture();
    execFileSync('ln', ['-s', '/nonexistent-release-source', join(root, 'apps/web/src/link')]);
    expect(check(root).status).toBe(1);
  });

  it('does not echo comment contents when reporting a finding', () => {
    const root = fixture();
    source(
      root,
      'apps/web/src/private-marker.ts',
      Array(11).fill('// TODO: synthetic-private-canary').join('\n'),
    );
    const result = check(root);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).not.toContain('synthetic-private-canary');
  });
});
