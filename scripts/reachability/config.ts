/**
 * Shared configuration for the reachability guard.
 *
 * The guard only judges *production* source under apps/web/src. Tests, stories,
 * fixtures, examples and standalone scripts are entry points in their own right
 * and are out of scope by construction.
 */

import path from 'path';

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const REACHABILITY_DIR = path.join(REPO_ROOT, 'scripts', 'reachability');
export const BASELINE_PATH = path.join(REACHABILITY_DIR, 'reachability-baseline.txt');
export const MANIFEST_PATH = path.join(REACHABILITY_DIR, 'reachability-manifest.json');

/** A file is in scope when it is production TypeScript under apps/web/src. */
const IN_SCOPE_PREFIX = 'apps/web/src/';

const OUT_OF_SCOPE = [
  /\.d\.ts$/,
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /\.stories\.tsx?$/,
  /\/__tests__\//,
  /\/__mocks__\//,
  /\/__examples__\//,
  /^apps\/web\/src\/test\//,
  /^apps\/web\/src\/scripts\//,
];

export function isProductionFile(file: string): boolean {
  if (!file.startsWith(IN_SCOPE_PREFIX)) return false;
  if (!/\.tsx?$/.test(file)) return false;
  return !OUT_OF_SCOPE.some((pattern) => pattern.test(file));
}

export function scopeUnreachable(files: string[]): string[] {
  return files.filter(isProductionFile).sort();
}
