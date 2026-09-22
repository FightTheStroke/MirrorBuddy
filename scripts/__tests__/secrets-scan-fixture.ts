// Shared fixture harness for the scripts/secrets-scan.sh regressions. Each
// checkout runs the UNMODIFIED script bytes through the real CLI. Planted values
// are generated at run time, so nothing credential-shaped is committed here.
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { expect } from 'vitest';

const BASH = '/bin/bash';
const repository = resolve(import.meta.dirname, '../..');
export const scanner = join(repository, 'scripts/secrets-scan.sh');
// Complete external-utility inventory of the scanner: dirname (:20), rm (:47),
// mktemp (:55), chmod (:56), date (:176). Everything else it runs is a bash
// builtin. Ripgrep is deliberately excluded so it can never leak in.
const UTILITIES = ['chmod', 'date', 'dirname', 'mktemp', 'rm'];
const CANONICAL_DIRS = ['apps/web/src', 'packages/ui/src', 'apps/web/e2e', 'scripts'];
const roots: string[] = [];

export const SHARED_REPORT = '/tmp/secrets-scan-report.md';

export function cleanupRoots(): void {
  while (roots.length) fs.rmSync(roots.pop() as string, { recursive: true, force: true });
}

export const random = (length: number) => randomBytes(64).toString('hex').slice(0, length);

// Connection-shaped fixture inputs are assembled from named components at run
// time. The scanner must still match the VALUES these builders produce, so this
// is not concealment: no complete connection literal is stored in the source,
// because a stored one is itself a finding.
const SCHEME = 'postgres';
const SCHEME_LONG = 'postgresql';
const REMOTE_HOST = 'db.example.com';
const LOOPBACK_HOST = 'localhost';
const PORT = '5432';
const PERSONAL_USER = 'roberdan';
const connection = (user: string, secret: string, host: string, database: string) =>
  [SCHEME, '://', user, ':', secret, '@', host, ':', PORT, '/', database].join('');

export const synthetic = {
  resendKey: () => `re_${random(28)}`,
  privateKey: () => `${'-'.repeat(5)}BEGIN RSA PRIVATE KEY${'-'.repeat(5)}\n${random(40)}`,
  remoteDsn: () => connection('app_user', random(16), REMOTE_HOST, 'app'),
  localDsn: () => connection('app_user', random(16), LOOPBACK_HOST, 'app'),
  sentryDsn: () => `https://${random(32)}@o12345.ingest.invalid/42`,
  vercelId: () => `prj_${random(24)}`,
  jwt: () => `eyJ${random(52)}.eyJ${random(52)}.${random(20)}`,
  personalUsername: () => [SCHEME_LONG, '://', PERSONAL_USER, '@db.internal/app'].join(''),
  awsStyleUsername: () => [SCHEME, '.', 'db', ':', 'pw', '@', 'aws'].join(''),
  personalEmail: () => 'mariodanfts@example.invalid',
};

/** Absolute path of an executable, resolved without a login shell. */
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

/** Symlink a utility into the fixture bin, failing loudly if it does not resolve. */
function link(target: string, path: string): void {
  fs.symlinkSync(target, path);
  expect(fs.existsSync(path), `${path} must resolve after linking`).toBe(true);
}

function plant(root: string, relative: string, contents: string): void {
  const file = join(root, relative);
  fs.mkdirSync(dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

export function checkout(files: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(join(tmpdir(), 'mb-secrets-scan-'));
  roots.push(root);
  for (const directory of [...CANONICAL_DIRS, 'tmp', 'bin']) {
    fs.mkdirSync(join(root, directory), { recursive: true });
  }
  fs.copyFileSync(scanner, join(root, 'scripts/secrets-scan.sh'));
  for (const utility of UTILITIES) link(locate(utility), join(root, 'bin', utility));
  for (const [relative, contents] of Object.entries(files)) plant(root, relative, contents);
  return root;
}

export type Search = 'installed' | 'absent' | 'failing';
type Report = { path: string; contents: string; mode: number };
export interface Outcome {
  status: number;
  stdout: string;
  stderr: string;
  critical?: number;
  warnings?: number;
  report?: Report;
}

export function scan(root: string, options: { args?: string[]; search?: Search } = {}): Outcome {
  const { args = ['--json'], search = 'installed' } = options;
  const bin = join(root, 'bin');
  if (search === 'installed') link(locate('rg'), join(bin, 'rg'));
  if (search === 'failing') {
    const fake = join(bin, 'rg');
    fs.writeFileSync(fake, '#!/bin/sh\necho "search engine refused the pattern" >&2\nexit 2\n');
    fs.chmodSync(fake, 0o755);
  }

  const result = spawnSync(BASH, [join(root, 'scripts/secrets-scan.sh'), ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { PATH: bin, HOME: root, TMPDIR: join(root, 'tmp') },
  });
  expect(result.error, 'the scanner must launch').toBeUndefined();
  expect(result.signal, 'the scanner must not be signalled').toBeNull();
  expect(typeof result.status, 'the scanner must return a numeric status').toBe('number');

  const stdout = result.stdout ?? '';
  const outcome: Outcome = { status: result.status as number, stdout, stderr: result.stderr ?? '' };

  const summary = /\{"status":.*\}/.exec(stdout)?.[0];
  if (summary) {
    const parsed = JSON.parse(summary) as { critical: number; warnings: number };
    outcome.critical = parsed.critical;
    outcome.warnings = parsed.warnings;
  }
  const reported =
    /"report":"([^"]+)"/.exec(stdout)?.[1] ?? /^\s*Report:\s*(\S+)\s*$/m.exec(stdout)?.[1];
  if (reported && fs.existsSync(reported)) {
    outcome.report = {
      path: reported,
      contents: fs.readFileSync(reported, 'utf8'),
      mode: fs.statSync(reported).mode & 0o777,
    };
  }
  return outcome;
}
