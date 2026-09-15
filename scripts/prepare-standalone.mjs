/* eslint-disable security/detect-non-literal-fs-filename -- Sources and destinations are fixed build paths; asset entries are checked before copying. */
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function directory(path) {
  if (!lstatSync(path).isDirectory() || realpathSync(path) !== path) {
    throw new Error('Standalone paths must be ordinary, unlinked directories');
  }
}

function file(path, writable = false) {
  const stat = lstatSync(path);
  if (!stat.isFile() || (writable && stat.nlink !== 1)) {
    throw new Error('Standalone assets must be ordinary, unshared destination files');
  }
}

function existing(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return undefined;
  }
}

/** Resolve only the generated standalone layout and require matching completed build IDs. */
export function standalonePaths(input) {
  if (typeof input !== 'string' || !isAbsolute(input)) {
    throw new Error('An absolute source checkout root is required');
  }
  const root = realpathSync(input);
  directory(root);
  const build = join(root, 'apps/web/.next');
  const standalone = join(build, 'standalone');
  const app = join(standalone, 'apps/web');
  for (const path of [
    join(root, 'apps'),
    join(root, 'apps/web'),
    build,
    standalone,
    join(standalone, 'apps'),
    app,
    join(app, '.next'),
  ])
    directory(path);
  file(join(app, 'server.js'));
  file(join(build, 'BUILD_ID'));
  file(join(app, '.next/BUILD_ID'));
  const id = readFileSync(join(build, 'BUILD_ID'), 'utf8').trim();
  if (!id || readFileSync(join(app, '.next/BUILD_ID'), 'utf8').trim() !== id) {
    throw new Error('Standalone BUILD_ID must match the completed canonical build');
  }
  return {
    root,
    build,
    standalone,
    app,
    assets: [
      { source: join(root, 'apps/web/public'), destination: join(app, 'public') },
      { source: join(build, 'static'), destination: join(app, '.next/static') },
    ],
  };
}

function inventory(root, writable = false) {
  const directories = [];
  const files = [];
  function walk(path) {
    directory(path);
    directories.push(path);
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) walk(child);
      else {
        file(child, writable);
        files.push(child);
      }
    }
  }
  walk(root);
  return { directories, files };
}

function createDirectory(path) {
  directory(dirname(path));
  if (!existing(path)) mkdirSync(path);
  directory(path);
}

function copyAsset(source, destination) {
  file(source);
  directory(dirname(destination));
  if (existing(destination)) file(destination, true);
  const temporary = mkdtempSync(join(dirname(destination), '.prepare-standalone-'));
  const staged = join(temporary, 'asset');
  try {
    copyFileSync(source, staged);
    if (existing(destination)) file(destination, true);
    renameSync(staged, destination);
  } finally {
    rmSync(staged, { force: true });
    rmdirSync(temporary);
  }
}

/**
 * Copy asset contents, not their containing directories, after a successful Next build.
 * Repeated calls overwrite matching files atomically; no source or extra destination files
 * are deleted. All source/destination trees are inspected before the first copy.
 */
export function prepareStandalone(root) {
  const paths = standalonePaths(root);
  const plans = paths.assets.map(({ source, destination }) => {
    const entries = inventory(source);
    if (existing(destination)) inventory(destination, true);
    return { source, destination, ...entries };
  });
  for (const plan of plans) {
    for (const path of plan.directories) {
      createDirectory(join(plan.destination, relative(plan.source, path)));
    }
    for (const path of plan.files) {
      copyAsset(path, join(plan.destination, relative(plan.source, path)));
    }
  }
  return paths.app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 3) throw new Error('Unexpected preparation arguments');
    prepareStandalone(process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url)));
    console.log('Standalone public and static assets prepared');
  } catch {
    console.error('Standalone preparation failed; check completed build and unlinked asset paths');
    process.exitCode = 1;
  }
}
