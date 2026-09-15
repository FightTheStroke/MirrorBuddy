/* eslint-disable security/detect-non-literal-fs-filename -- Fixed artifact basenames are validated inside a marked external evidence directory. */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { basename, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIdentity, digest, inputIdentity } from './release-evidence-inputs.mjs';
import { validateExpectedScope } from './release-evidence-scope.mjs';
import {
  validateAudit,
  validateBrowser,
  validateCoverage,
  validateUnit,
} from './release-evidence-native.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const kinds = ['policy', 'pre-release', 'audit', 'unit', 'e2e'];
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function recipe(kind, directory) {
  switch (kind) {
    case 'policy':
      return ['bash', 'scripts/release-policy-check.sh'];
    case 'pre-release':
      return ['npm', 'run', 'pre-release'];
    case 'audit':
      return ['pnpm', 'audit', '--audit-level=high', '--json'];
    case 'unit':
      return [
        'npm',
        'run',
        'test:unit',
        '--',
        '--reporter=dot',
        '--coverage',
        '--allowOnly=false',
        '--reporter=json',
        `--outputFile=${join(directory, 'unit.json')}`,
      ];
    case 'e2e':
      return ['npm', 'run', 'test', '--', '--forbid-only'];
    default:
      throw new Error('Unknown release check');
  }
}

export function artifact(directory, name) {
  if (
    typeof name !== 'string' ||
    basename(name) !== name ||
    !/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(name)
  ) {
    throw new Error('Invalid evidence artifact name');
  }
  const file = join(directory, name);
  let stat;
  try {
    stat = lstatSync(file);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (stat && (!stat.isFile() || stat.nlink !== 1)) {
    throw new Error('Evidence artifacts must be ordinary, unshared files');
  }
  return file;
}

export function evidenceDirectory(input, create = false, sourceRoot = root) {
  if (typeof input !== 'string' || !input)
    throw new Error('An explicit evidence directory is required');
  if (create) mkdirSync(input, { recursive: true, mode: 0o700 });
  const directory = realpathSync(input);
  const rel = relative(realpathSync(sourceRoot), directory);
  if (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('../')) {
    throw new Error('Evidence must be stored outside the source checkout');
  }
  if ((lstatSync(directory).mode & 0o077) !== 0) {
    throw new Error('Native evidence requires a private directory (0700 permissions)');
  }
  const marker = artifact(directory, 'format.json');
  if (!existsSync(marker)) {
    if (!create || readdirSync(directory).length)
      throw new Error('Missing recognized native evidence directory');
    writeFileSync(marker, '{"format":"mirrorbuddy-native-release-v1"}\n', { mode: 0o600 });
  }
  if (native(directory, 'format.json')?.format !== 'mirrorbuddy-native-release-v1') {
    throw new Error('Unrecognized evidence format');
  }
  return directory;
}

export function reports(kind) {
  if (!kinds.includes(kind)) throw new Error('Unknown release check');
  if (kind === 'unit') return ['unit.json', 'coverage.json', 'unit.scope.json'];
  if (kind === 'e2e') return ['e2e.json', 'e2e.scope.json'];
  if (kind === 'audit') return ['audit.json'];
  return [];
}

export function native(directory, name) {
  try {
    return JSON.parse(readFileSync(artifact(directory, name), 'utf8'));
  } catch {
    throw new Error(`Missing or invalid native JSON artifact: ${name}`);
  }
}

export function validateReports(kind, directory) {
  if (kind === 'unit') {
    validateUnit(native(directory, 'unit.json'));
    validateCoverage(native(directory, 'coverage.json'));
  } else if (kind === 'e2e') validateBrowser(native(directory, 'e2e.json'));
  else if (kind === 'audit') validateAudit(native(directory, 'audit.json'));
}

export function validateSourceScope(kind, directory, sourceRoot) {
  const within = (file) => {
    if (typeof file !== 'string' || !isAbsolute(file)) return false;
    const rel = relative(sourceRoot, file);
    return !isAbsolute(rel) && rel !== '..' && !rel.startsWith('../');
  };
  if (kind === 'unit') {
    const unit = native(directory, 'unit.json');
    const coverage = native(directory, 'coverage.json');
    if (
      unit.testResults.some((suite) => !within(suite.name)) ||
      Object.entries(coverage).some(([file, data]) => !within(file) || !within(data?.path))
    ) {
      throw new Error('Native unit or coverage report belongs to a different source checkout');
    }
  } else if (kind === 'e2e' && !within(native(directory, 'e2e.json').config?.rootDir)) {
    throw new Error('Native browser report belongs to a different source checkout');
  }
}

export function readReceipt(kind, directory, identity = inputIdentity(root)) {
  if (!kinds.includes(kind)) throw new Error('Unknown release check');
  const receipt = native(directory, `${kind}.receipt.json`);
  if (
    receipt?.version !== 1 ||
    receipt.kind !== kind ||
    receipt.exitCode !== 0 ||
    !same(receipt.identity, identity) ||
    !same(receipt.command, recipe(kind, directory)) ||
    !Number.isSafeInteger(receipt.startedAt) ||
    !Number.isSafeInteger(receipt.finishedAt) ||
    receipt.startedAt < 0 ||
    receipt.startedAt > receipt.finishedAt ||
    receipt.finishedAt > Date.now()
  ) {
    throw new Error(`${kind} evidence is stale, incomplete, failed, or from a different scope`);
  }
  if (['policy', 'audit'].includes(kind) && Date.now() - receipt.finishedAt > 3_600_000) {
    throw new Error(`${kind} evidence expired; rerun the current checks before collection`);
  }
  for (const name of reports(kind)) {
    if (receipt.reportHashes?.[name] !== digest(readFileSync(artifact(directory, name)))) {
      throw new Error(`${kind} native report identity changed`);
    }
  }
  validateReports(kind, directory);
  validateSourceScope(kind, directory, identity.root);
  if (kind === 'unit' || kind === 'e2e') validateExpectedScope(kind, directory, identity.root);
  if (kind === 'pre-release' || kind === 'e2e') {
    const currentBuild = buildIdentity(identity.root);
    if (receipt.buildAfter !== currentBuild) {
      if (
        kind !== 'pre-release' ||
        readReceipt('e2e', directory, identity).buildBefore !== receipt.buildAfter
      ) {
        throw new Error('Application build changed after the recorded checks');
      }
    }
  }
  return receipt;
}
