/* eslint-disable security/detect-non-literal-fs-filename -- Paths are confined to canonical source trees and private fixed-name artifacts. */
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const requireScope = (condition) => {
  if (!condition) throw new Error('Invalid release scope');
};
export const equalScope = (actual, expected) => requireScope(isDeepStrictEqual(actual, expected));
export const positive = (value) => Number.isSafeInteger(value) && value > 0;
const within = (root, path) => {
  const rel = relative(root, path);
  return rel !== '' && rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel);
};

export function context(kind, directory, sourceRoot) {
  requireScope(['unit', 'e2e'].includes(kind));
  for (const path of [directory, sourceRoot]) {
    requireScope(typeof path === 'string' && isAbsolute(path));
    requireScope(lstatSync(path).isDirectory() && realpathSync(path) === resolve(path));
  }
  const root = realpathSync(sourceRoot);
  const dir = realpathSync(directory);
  requireScope(dir !== root && !within(root, dir) && (lstatSync(dir).mode & 0o077) === 0);
  return { root, dir };
}

export function privateArtifact(directory, name, absent = false) {
  requireScope(
    /^(unit\.scope|e2e\.scope|unit|e2e|coverage|inventory|files|declarations)\.json$/.test(name),
  );
  const path = join(directory, name);
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code !== 'ENOENT' || !absent) throw error;
  }
  if (stat) {
    requireScope(stat.isFile() && stat.nlink === 1);
    if (name.endsWith('.scope.json')) requireScope((stat.mode & 0o077) === 0);
  }
  return path;
}

export function readArtifact(directory, name) {
  return JSON.parse(readFileSync(privateArtifact(directory, name), 'utf8'));
}

export function sourcePath(root, file, base = root) {
  requireScope(typeof file === 'string' && file.length > 0 && !file.includes('\0'));
  const path = resolve(base, file);
  requireScope(file === (isAbsolute(file) ? path : relative(base, path)));
  requireScope(within(root, path) && realpathSync(path) === path && lstatSync(path).isFile());
  return relative(root, path).split('\\').join('/');
}

function tree(root, folder) {
  const path = join(root, folder);
  let entries;
  try {
    entries = readdirSync(path, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  requireScope(realpathSync(path) === path);
  return entries.flatMap((entry) => {
    requireScope(!entry.isSymbolicLink());
    const file = `${folder}/${entry.name}`;
    return entry.isDirectory() ? tree(root, file) : entry.isFile() ? [file] : [];
  });
}

export function canonicalScope(root) {
  const files = [
    ...tree(root, 'apps/web/src').filter((file) => /\.(test\.tsx?|spec\.ts)$/.test(file)),
    ...tree(root, 'scripts/__tests__').filter((file) => file.endsWith('.test.ts')),
    ...tree(root, 'apps/web/scripts/__tests__').filter((file) => file.endsWith('.test.ts')),
  ].sort();
  const coverage = ['education', 'ai', 'safety', 'tools', 'profile', 'pdf-generator']
    .flatMap((area) => tree(root, `apps/web/src/lib/${area}`))
    .filter(
      (file) =>
        (file.endsWith('.ts') ||
          /^apps\/web\/src\/lib\/pdf-generator\/components\/[^/]+\.tsx$/.test(file)) &&
        !/\.config\.|\.d\.ts$|\.(test|spec)\.ts$/.test(file),
    )
    .sort();
  requireScope(files.length > 0 && coverage.length > 0);
  return { files, coverage };
}

export function unitInventory(root, inventory, discovered, expected) {
  requireScope(Array.isArray(discovered) && Array.isArray(inventory) && inventory.length > 0);
  const files = discovered
    .map((entry) => {
      const file = entry?.file;
      requireScope(typeof file === 'string' && isAbsolute(file));
      return sourcePath(root, file);
    })
    .sort();
  equalScope(files, expected);
  const counts = new Map(files.map((file) => [file, 0]));
  for (const test of inventory) {
    requireScope(
      typeof test?.name === 'string' && test.name.length > 0 && isAbsolute(test.file ?? ''),
    );
    const file = sourcePath(root, test.file);
    requireScope(counts.has(file));
    counts.set(file, counts.get(file) + 1);
  }
  return [...counts].map(([file, cases]) => ({ file, cases }));
}

export function declaredUnitInventory(root, declarations, eligible) {
  requireScope(Array.isArray(declarations));
  const files = declarations
    .map((entry) => {
      requireScope(typeof entry?.file === 'string' && isAbsolute(entry.file));
      requireScope(Number.isSafeInteger(entry.cases) && entry.cases >= 0);
      requireScope(
        Number.isSafeInteger(entry.eligible) &&
          entry.eligible >= 0 &&
          entry.eligible <= entry.cases,
      );
      return { file: sourcePath(root, entry.file), cases: entry.cases, eligible: entry.eligible };
    })
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  equalScope(
    files.map(({ file, eligible: cases }) => ({ file, cases })),
    eligible,
  );
  return files.map(({ file, cases }) => ({ file, cases }));
}

export function browserInventory(root, report) {
  requireScope(report && Array.isArray(report.errors) && report.errors.length === 0);
  const config = report.config;
  requireScope(typeof config?.rootDir === 'string' && isAbsolute(config.rootDir));
  const rootDir = resolve(config.rootDir);
  requireScope(within(root, rootDir) && realpathSync(rootDir) === rootDir);
  requireScope(Array.isArray(config.projects) && config.projects.length > 0);
  const projects = config.projects
    .map((project) => {
      requireScope(typeof project?.id === 'string');
      return project.id;
    })
    .sort();
  requireScope(new Set(projects).size === projects.length);
  const counts = new Map();
  function visit(suites) {
    requireScope(Array.isArray(suites));
    for (const suite of suites) {
      requireScope(suite && typeof suite === 'object' && !Array.isArray(suite));
      requireScope(suite.specs === undefined || Array.isArray(suite.specs));
      for (const spec of suite.specs ?? []) {
        requireScope(typeof spec?.id === 'string' && spec.id.length > 0 && spec.only !== true);
        requireScope(typeof spec.file === 'string' && !isAbsolute(spec.file));
        const file = sourcePath(root, spec.file, rootDir);
        requireScope(within(rootDir, join(root, file)));
        requireScope(Array.isArray(spec.tests) && spec.tests.length > 0);
        for (const test of spec.tests) {
          requireScope(typeof test?.projectId === 'string' && projects.includes(test.projectId));
          const key = JSON.stringify([file, test.projectId]);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      visit(suite.suites ?? []);
    }
  }
  visit(report.suites);
  requireScope(counts.size > 0);
  const files = [...counts]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, cases]) => {
      const [file, projectId] = JSON.parse(key);
      return { file, projectId, cases };
    });
  return { rootDir, projects, files };
}
