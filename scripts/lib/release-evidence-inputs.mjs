/* eslint-disable security/detect-non-literal-fs-filename -- Paths are Git inventory entries or fixed local configuration/build paths, never report-supplied filenames. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { standalonePaths } from '../prepare-standalone.mjs';

export const digest = (value) => createHash('sha256').update(value).digest('hex');

function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        GIT_DIR: undefined,
        GIT_WORK_TREE: undefined,
        GIT_INDEX_FILE: undefined,
        GIT_COMMON_DIR: undefined,
      },
    });
  } catch {
    throw new Error('Release evidence requires a readable Git checkout');
  }
}

function addPath(hash, root, file, followLink = false) {
  const absolute = resolve(root, file);
  const rel = relative(root, absolute);
  if (rel.startsWith('../') || rel === '..') throw new Error('Source inventory escaped its root');
  hash.update(`${file}\0`);
  let stat;
  try {
    stat = lstatSync(absolute);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    hash.update('absent\0');
    return;
  }
  if (stat.isSymbolicLink() && !followLink) {
    hash.update(`link:${readlinkSync(absolute)}\0`);
  } else if (stat.isFile() || (stat.isSymbolicLink() && followLink)) {
    hash.update(`${stat.mode}\0`);
    hash.update(readFileSync(absolute));
  } else {
    throw new Error('Unexpected source inventory entry');
  }
  hash.update('\0');
}

export function inputIdentity(directory, environment = process.env) {
  if (
    typeof directory !== 'string' ||
    !directory ||
    !environment ||
    typeof environment !== 'object' ||
    Array.isArray(environment)
  ) {
    throw new Error('Invalid release input identity');
  }
  const root = realpathSync(directory);
  if (realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim()) !== root) {
    throw new Error('Release evidence requires the source checkout root');
  }
  const revision = git(root, ['rev-parse', 'HEAD']).trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Invalid source revision');
  const files = new Set(
    git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
      .split('\0')
      .filter(Boolean),
  );
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    // global-setup.ts unconditionally regenerates this test output before using it.
    if (file !== 'apps/web/e2e/.auth/storage-state.json') addPath(hash, root, file);
  }
  for (const prefix of ['', 'apps/web/']) {
    for (const name of [
      '.env',
      '.env.local',
      '.env.test',
      '.env.test.local',
      '.env.production',
      '.env.production.local',
    ]) {
      addPath(hash, root, `${prefix}${name}`, true);
    }
  }
  const volatile = new Set([
    '_',
    'SHLVL',
    'PWD',
    'OLDPWD',
    'npm_lifecycle_event',
    'npm_lifecycle_script',
    'npm_config_argv',
  ]);
  const entries = Object.entries(environment)
    .filter(([name]) => !volatile.has(name))
    .sort(([left], [right]) => left.localeCompare(right));
  if (entries.some(([, value]) => typeof value !== 'string'))
    throw new Error('Invalid environment identity');
  let pnpm;
  try {
    pnpm = execFileSync('pnpm', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error('Cannot establish pnpm tool identity');
  }
  return {
    root,
    revision,
    source: hash.digest('hex'),
    environment: digest(JSON.stringify(entries)),
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    pnpm,
  };
}

export function buildIdentity(root) {
  if (typeof root !== 'string' || !root) throw new Error('Build root is required');
  root = realpathSync(root);
  const base = join(root, 'apps/web/.next');
  const hash = createHash('sha256');
  const missingBuild =
    'Missing completed application build. Run pre-release verification before browser checks.';
  let buildId;
  try {
    buildId = readFileSync(join(base, 'BUILD_ID'), 'utf8').trim();
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    throw new Error(missingBuild);
  }
  if (!buildId) throw new Error(missingBuild);
  hash.update(buildId);
  function walk(directory, linkRoot) {
    const stat = lstatSync(directory);
    if (!stat.isDirectory() || realpathSync(directory) !== directory) {
      throw new Error('Build output directories must not be linked');
    }
    hash.update(`directory:${relative(root, directory)}:${stat.mode}\0`);
    const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      const file = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        if (!linkRoot) throw new Error('Build output contains an unsupported link');
        let target;
        try {
          target = realpathSync(file);
        } catch {
          throw new Error('Standalone build contains a dangling or unreadable link');
        }
        const rel = relative(linkRoot, target);
        if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) {
          throw new Error('Standalone build link escapes the served tree');
        }
        hash.update(`resolved-link:${rel}\0`);
        addPath(hash, root, relative(root, file));
      } else if (entry.isDirectory()) walk(file, linkRoot);
      else if (entry.isFile()) addPath(hash, root, relative(root, file));
      else throw new Error('Unexpected build output entry');
    }
  }
  walk(join(base, 'server'));
  walk(join(base, 'static'));
  for (const file of ['build-manifest.json', 'routes-manifest.json', 'prerender-manifest.json']) {
    addPath(hash, root, `apps/web/.next/${file}`);
  }
  const served = standalonePaths(root);
  for (const { destination } of served.assets) {
    if (!lstatSync(destination).isDirectory() || realpathSync(destination) !== destination) {
      throw new Error('Standalone public and static assets must be prepared before verification');
    }
  }
  // Do not traverse links twice: their contained targets are hashed by the ordinary tree walk.
  walk(served.standalone, served.standalone);
  return hash.digest('hex');
}
