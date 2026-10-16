/* eslint-disable security/detect-non-literal-fs-filename -- Reads only the current completed local build; links must stay inside its standalone tree. */
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { buildIdentity, digest } from './release-evidence-inputs.mjs';

const vulnerable = (path) =>
  path
    .split(/[/\\]/)
    .some((segment) => ['braces', 'micromatch'].includes(segment.split('@')[0].toLowerCase()));

function checkManifest(file) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  if (['braces', 'micromatch'].includes(pkg?.name))
    throw new Error('Vulnerable runtime package manifest');
}

export function runtimeAbsence(root) {
  if (typeof root !== 'string' || !root) throw new Error('Missing runtime build root');
  const build = buildIdentity(root);
  const base = resolve(root, 'apps/web/.next');
  const standalone = join(base, 'standalone');
  const traces = [];
  let files = 0;
  const seen = new Set();
  function walk(directory, served) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (
        !served &&
        directory === base &&
        entry.name !== 'server' &&
        !entry.name.endsWith('.nft.json')
      )
        continue;
      const file = join(directory, entry.name);
      if (vulnerable(file)) throw new Error('Vulnerable package present in runtime output');
      if (entry.isSymbolicLink()) {
        if (!served) throw new Error('Unsupported runtime trace directory link');
        const target = realpathSync(file);
        const rel = relative(standalone, target);
        if (rel === '..' || rel.startsWith('../') || isAbsolute(rel))
          throw new Error('Runtime link escapes standalone');
        if (vulnerable(target)) throw new Error('Vulnerable runtime link target');
        if (entry.name === 'package.json') checkManifest(file);
        if (!seen.has(target)) {
          seen.add(target);
          if (lstatSync(target).isDirectory()) walk(target, true);
          else if (!lstatSync(target).isFile()) throw new Error('Unreadable runtime link');
        }
      } else if (entry.isDirectory()) {
        if (!seen.has(file)) {
          seen.add(file);
          walk(file, served);
        }
      } else if (entry.isFile()) {
        if (served) {
          files++;
          if (entry.name === 'package.json') checkManifest(file);
        }
        if (entry.name.endsWith('.nft.json')) {
          const raw = readFileSync(file, 'utf8');
          const trace = JSON.parse(raw);
          if (
            trace?.version !== 1 ||
            !Array.isArray(trace.files) ||
            trace.files.length === 0 ||
            trace.files.some(
              (path) =>
                typeof path !== 'string' ||
                !path ||
                vulnerable(path) ||
                vulnerable(realpathSync(resolve(dirname(file), path))),
            )
          )
            throw new Error('Invalid trace or vulnerable runtime dependency');
          traces.push([relative(base, file), digest(raw)]);
        }
      } else throw new Error('Unreadable runtime inventory entry');
    }
  }
  walk(base, false);
  walk(standalone, true);
  if (traces.length === 0 || files === 0) throw new Error('Missing runtime absence inventory');
  if (build !== buildIdentity(root)) throw new Error('Runtime build changed during absence check');
  return { build, traces: traces.length, traceHash: digest(JSON.stringify(traces)), files };
}
