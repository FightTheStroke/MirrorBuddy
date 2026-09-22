// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const roots: string[] = [];
function write(root: string, file: string, text: string) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
}
function fixture(entry = 'export const register = () => import("../sentry.server.config");') {
  const root = mkdtempSync(join(tmpdir(), 'mb-lazy-inventory-'));
  roots.push(root);
  mkdirSync(join(root, 'packages'));
  write(
    root,
    'apps/web/tsconfig.json',
    JSON.stringify({
      compilerOptions: { moduleResolution: 'bundler', paths: { '@/*': ['./src/*'] } },
    }),
  );
  write(root, 'apps/web/src/instrumentation.ts', entry);
  write(
    root,
    'apps/web/sentry.server.config.ts',
    'import { initialize } from "./runtime/initialize"; export const config = initialize();',
  );
  write(
    root,
    'apps/web/runtime/initialize.ts',
    'import { value } from "./value"; export const initialize = () => value;',
  );
  write(root, 'apps/web/runtime/value.ts', 'export const value = 1;');
  return root;
}
function scan(root: string) {
  const result = spawnSync(
    process.execPath,
    [
      join(repository, 'node_modules/tsx/dist/cli.mjs'),
      join(repository, 'scripts/check-lazy-loading.ts'),
    ],
    { cwd: root, encoding: 'utf8', timeout: 20_000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  return result;
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('lazy-loading runtime inventory boundaries', () => {
  it('inspects instrumentation app-root configuration and transitive local modules', () => {
    const root = fixture();
    const result = scan(root);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
  it('retains a dynamic boundary across transitive app-root configuration imports', () => {
    const root = fixture();
    write(
      root,
      'apps/web/runtime/value.ts',
      'import { BarChart } from "recharts"; export const value = BarChart;',
    );
    const result = scan(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 eager, 1 behind dynamic boundaries');
  });
  it('rejects eager heavy imports reached through app-root configuration', () => {
    const root = fixture(
      'import { config } from "../sentry.server.config"; export const value = config;',
    );
    write(
      root,
      'apps/web/runtime/value.ts',
      'import { BarChart } from "recharts"; export const value = BarChart;',
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Eager Recharts runtime path: apps/web/runtime/value.ts');
  });
  it('retains the static KaTeX prohibition in newly inspected modules', () => {
    const root = fixture();
    write(
      root,
      'apps/web/runtime/value.ts',
      'import katex from "katex"; export const value = katex;',
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Static KaTeX import: apps/web/runtime/value.ts');
  });
  it('fails closed on a genuinely unresolved transitive local import', () => {
    const root = fixture();
    write(
      root,
      'apps/web/runtime/value.ts',
      'import { missing } from "./missing"; export const value = missing;',
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Unresolved local import: apps/web/runtime/value.ts -> ./missing',
    );
  });
  it('handles a transitive cycle without truncating the runtime graph', () => {
    const root = fixture();
    write(
      root,
      'apps/web/runtime/value.ts',
      'import { initialize } from "./initialize"; export const value = () => initialize;',
    );
    expect(scan(root).status).toBe(0);
  });
  it('does not inspect unrelated app-root files or type-only dependencies', () => {
    const root = fixture();
    write(root, 'apps/web/unused.ts', 'invalid TypeScript !!!');
    write(root, 'apps/web/type-only.ts', 'import katex from "katex"; export type Config = string;');
    write(
      root,
      'apps/web/sentry.server.config.ts',
      'import type { Config } from "./type-only"; export const config: Config = "fixture";',
    );
    expect(scan(root).status).toBe(0);
  });
  it.each([
    'node_modules/private',
    'generated',
    'dist',
    'build',
    'coverage',
    'worktrees',
    'playwright-report',
    'test-results',
    '.next',
    '.private',
    'secrets',
    '__tests__',
    '__mocks__',
    'e2e',
    'tests',
  ])('refuses a transitive module in excluded directory %s', (directory) => {
    const root = fixture();
    write(root, `apps/web/${directory}/value.ts`, 'invalid TypeScript !!!');
    write(
      root,
      'apps/web/sentry.server.config.ts',
      `import { value } from "./${directory}/value"; export const config = value;`,
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Resolved local module outside inspected inventory: apps/web/sentry.server.config.ts -> ./${directory}/value`,
    );
    expect(result.stderr).not.toContain('Invalid TypeScript syntax');
  });
  it('refuses a resolved module outside application and workspace package roots', () => {
    const root = fixture();
    write(root, 'private/value.ts', 'export const value = 1;');
    write(
      root,
      'apps/web/sentry.server.config.ts',
      'import { value } from "../../private/value"; export const config = value;',
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'outside inspected inventory: apps/web/sentry.server.config.ts',
    );
  });
  it('refuses symbolic links even when their target is within the application', () => {
    const root = fixture();
    symlinkSync(join(root, 'apps/web/runtime/value.ts'), join(root, 'apps/web/linked.ts'));
    write(
      root,
      'apps/web/sentry.server.config.ts',
      'import { value } from "./linked"; export const config = value;',
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'outside inspected inventory: apps/web/sentry.server.config.ts',
    );
  });
  it('refuses transitive test files', () => {
    const root = fixture();
    write(root, 'apps/web/runtime/value.test.ts', 'export const value = 1;');
    write(
      root,
      'apps/web/sentry.server.config.ts',
      'import { value } from "./runtime/value.test"; export const config = value;',
    );
    const result = scan(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'outside inspected inventory: apps/web/sentry.server.config.ts',
    );
  });
});
