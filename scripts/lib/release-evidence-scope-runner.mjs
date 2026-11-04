/* eslint-disable security/detect-non-literal-fs-filename -- Fixed artifacts in a validated private directory. */
import { chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { privateArtifact, readArtifact } from './release-evidence-scope-policy.mjs';

// Stages: 0=context, 1=list cases, 2=canonical inventory, 3=list files,
// 4=reconcile files/cases, 5=collect declarations, 6=reconcile declarations,
// 7=browser inventory, 8=write scope, 9=cleanup.
// Reasons: 1=timeout, 2=spawn error, 3=signal, 4=nonzero exit, 5=artifact, 6=validation.
export class ScopeCaptureError extends Error {
  constructor(kind, stage, reason = 6, status = 0) {
    const kindId = kind === 'unit' ? 1 : kind === 'e2e' ? 2 : 0;
    const code = Number.isSafeInteger(status) && status >= 0 && status <= 255 ? status : 0;
    super(
      `Release scope capture failed: __SCOPE_FAILURE__ kind=${kindId} stage=${stage} reason=${reason} exit=${code}`,
    );
  }
}

export function runScopeSubprocess(kind, stage, args, options) {
  let result;
  try {
    result = spawnSync(process.execPath, args, { ...options, stdio: 'ignore', timeout: 300_000 });
  } catch {
    throw new ScopeCaptureError(kind, stage, 2);
  }
  const reason =
    result?.error?.code === 'ETIMEDOUT'
      ? 1
      : result?.error
        ? 2
        : result?.signal
          ? 3
          : result?.status !== 0
            ? 4
            : 0;
  if (reason) throw new ScopeCaptureError(kind, stage, reason, result?.status);
}

export const commands = {
  unit: ['node_modules/vitest/vitest.mjs', 'list', '--root', 'apps/web', '--allowOnly=false'],
  e2e: [
    'node_modules/@playwright/test/cli.js',
    'test',
    '--config=apps/web/playwright.config.ts',
    '--list',
    '--reporter=json',
    '--forbid-only',
  ],
};
export const browserEnvironment = { E2E_TESTS: '1' };
export function discover(kind, directory, root, filesOnly = false) {
  const name = filesOnly ? 'files.json' : 'inventory.json';
  const output = privateArtifact(directory, name, true);
  const args = [...commands[kind]];
  if (kind === 'unit') args.push(...(filesOnly ? ['--filesOnly'] : []), `--json=${output}`);
  runScopeSubprocess(kind, filesOnly ? 3 : 1, args, {
    cwd: root,
    env: {
      ...process.env,
      ...(kind === 'e2e' ? { ...browserEnvironment, PLAYWRIGHT_JSON_OUTPUT_FILE: output } : {}),
    },
  });
  // Native reporters inherit the caller's umask; discovery remains inside a 0700 directory.
  chmodSync(privateArtifact(directory, name), 0o600);
  return readArtifact(directory, name);
}

export function declarations(directory, root) {
  const output = privateArtifact(directory, 'declarations.json', true);
  runScopeSubprocess(
    'unit',
    5,
    [
      fileURLToPath(new URL('./release-evidence-scope.mjs', import.meta.url)),
      '--collect-declarations',
      output,
    ],
    { cwd: root, env: process.env },
  );
  return readArtifact(directory, 'declarations.json');
}
