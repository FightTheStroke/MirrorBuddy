// Shared fixture harness: execute the unchanged audit only inside owned checkouts.
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { expect } from 'vitest';

const BASH = '/bin/bash';
const repository = resolve(import.meta.dirname, '../..');
const auditScript = join(repository, 'scripts/env-var-audit.sh');
const declarationReader = join(repository, 'scripts/lib/collect-declared-env.mjs');
const UTILITIES = ['grep', 'sed', 'sort', 'node'];
export const SOURCE_ROOTS = [
  'apps/web/src',
  'apps/web/e2e',
  'apps/web/prisma',
  'packages/ui/src',
  'scripts',
];
export const UNDOCUMENTED = 'MB_FIXTURE_UNDOCUMENTED';
export const DOCUMENTED = 'MB_FIXTURE_DOCUMENTED';
export const OUTSIDE_CHECKOUT = 'MB_OUTSIDE_CHECKOUT_ONLY';
const roots: string[] = [];

export function cleanupRoots(): void {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
}

function locate(command: string): string {
  const found = spawnSync(BASH, ['-c', `command -v ${command}`], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin' },
  });
  expect(found.error, `${command} lookup must launch`).toBeUndefined();
  expect(found.status, `${command} must be installed`).toBe(0);
  const path = found.stdout.trim();
  expect(isAbsolute(path) && fs.existsSync(path), `${command} must resolve absolutely`).toBe(true);
  return path;
}

function link(target: string, path: string): void {
  fs.symlinkSync(target, path);
  expect(fs.existsSync(path), `${path} must resolve after linking`).toBe(true);
}

function typescriptPackage(): string {
  const entry = createRequire(import.meta.url).resolve('typescript');
  const packageRoot = resolve(dirname(entry), '..');
  expect(fs.existsSync(join(packageRoot, 'package.json')), 'typescript must be installed').toBe(
    true,
  );
  return packageRoot;
}

export function plant(root: string, relative: string, contents: string): void {
  const file = join(root, relative);
  fs.mkdirSync(dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

export function remove(root: string, relative: string): void {
  fs.rmSync(join(root, relative), { force: true });
  expect(fs.existsSync(join(root, relative)), `${relative} must be gone`).toBe(false);
}

export const usage = (name: string) => `export const value = process.env.${name} ?? '';\n`;
export const documentation = (names: string[]) => names.map((name) => `${name}=\n`).join('');
export const registryModule = (names: string[]) =>
  `export const criticalProductionEnv = [\n${names
    .map((name) => `  '${name}',`)
    .join('\n')}\n].map((name) => ({ name }));\n`;
export const validateScript = (names: string[]) =>
  `import { criticalProductionEnv } from './lib/production-env-policy';\n` +
  `const optional = [\n${names
    .map((name) => `  { name: '${name}', category: 'Testing' },`)
    .join('\n')}\n];\nexport default { criticalProductionEnv, optional };\n`;

export interface Fixture {
  files?: Record<string, string>;
  documented?: string[];
  registry?: string[];
  inline?: string[];
  omitRoots?: string[];
}

export function checkout(options: Fixture = {}): string {
  const {
    files = {},
    documented = [DOCUMENTED],
    registry = [DOCUMENTED],
    inline = [],
    omitRoots = [],
  } = options;
  const root = fs.mkdtempSync(join(tmpdir(), 'mb-env-audit-'));
  roots.push(root);
  const present = SOURCE_ROOTS.filter((directory) => !omitRoots.includes(directory));
  for (const directory of [...present, 'bin', 'tmp', 'scripts/lib']) {
    fs.mkdirSync(join(root, directory), { recursive: true });
  }
  fs.copyFileSync(auditScript, join(root, 'scripts/env-var-audit.sh'));
  fs.copyFileSync(declarationReader, join(root, 'scripts/lib/collect-declared-env.mjs'));
  fs.mkdirSync(join(root, 'node_modules'), { recursive: true });
  link(typescriptPackage(), join(root, 'node_modules/typescript'));
  for (const utility of UTILITIES) link(locate(utility), join(root, 'bin', utility));
  plant(root, '.env.example', documentation(documented));
  plant(root, 'scripts/lib/production-env-policy.ts', registryModule(registry));
  plant(root, 'scripts/validate-pre-deploy.ts', validateScript(inline));
  for (const [relative, contents] of Object.entries(files)) plant(root, relative, contents);
  return root;
}

export interface Outcome {
  status: number;
  stdout: string;
  stderr: string;
  output: string;
}

export function run(root: string, options: { search?: 'installed' | 'failing' } = {}): Outcome {
  if (options.search === 'failing') {
    const fake = join(root, 'bin/grep');
    fs.rmSync(fake, { force: true });
    fs.writeFileSync(fake, '#!/bin/sh\necho "search engine refused the pattern" >&2\nexit 2\n');
    fs.chmodSync(fake, 0o755);
  }
  const result = spawnSync(BASH, [join(root, 'scripts/env-var-audit.sh')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    env: { PATH: join(root, 'bin'), HOME: root, TMPDIR: join(root, 'tmp') },
  });
  expect(result.error, 'the audit must launch').toBeUndefined();
  expect(result.signal, 'the audit must not be signalled').toBeNull();
  expect(typeof result.status, 'the audit must return a numeric status').toBe('number');
  if (typeof result.status !== 'number') throw new Error('Audit returned no exit status');
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  return { status: result.status, stdout, stderr, output: stdout + stderr };
}
