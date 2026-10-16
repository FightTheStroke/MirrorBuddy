/* eslint-disable security/detect-non-literal-fs-filename -- Uses validated fixed artifact names in a private external evidence directory. */
import { spawnSync } from 'node:child_process';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { approvedException, auditMessage, evaluateAudit } from './lib/release-audit-exception.mjs';
import { runtimeAbsence } from './lib/release-audit-runtime.mjs';
import { digest } from './lib/release-evidence-inputs.mjs';
import { artifact, evidenceDirectory, root } from './lib/release-evidence-store.mjs';

export function runAudit(directory) {
  directory = evidenceDirectory(directory, true);
  function execute(args) {
    const result = spawnSync('pnpm', args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error || result.signal || !Number.isInteger(result.status))
      throw new Error('Native audit/dependency execution could not complete');
    return { exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
  }
  const raw = execute(['audit', '--audit-level=high', '--json']);
  const file = artifact(directory, 'audit.json');
  writeFileSync(file, raw.stdout, { mode: 0o600 });
  chmodSync(file, 0o600);
  const audit = JSON.parse(raw.stdout);
  const context = { rawExitCode: raw.exitCode, stderr: raw.stderr };
  if (audit?.metadata?.vulnerabilities?.high > 0) {
    const production = execute(['audit', '--prod', '--audit-level=high', '--json']);
    const why = execute(['why', 'braces', '--json']);
    Object.assign(context, {
      approval: approvedException,
      approvalHash: digest(
        readFileSync(new URL('./security/braces-exception.json', import.meta.url)),
      ),
      productionExitCode: production.exitCode,
      production: JSON.parse(production.stdout),
      productionStderr: production.stderr,
      whyExitCode: why.exitCode,
      why: JSON.parse(why.stdout),
      whyStderr: why.stderr,
      runtime: runtimeAbsence(root),
    });
  }
  const contextFile = artifact(directory, 'audit.context.json');
  writeFileSync(contextFile, JSON.stringify(context, null, 2), { mode: 0o600 });
  chmodSync(contextFile, 0o600);
  const result = evaluateAudit(audit, context);
  console.log(`${auditMessage(result)}; raw pnpm exit ${raw.exitCode}; evidence ${directory}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [directory, ...extra] = process.argv.slice(2);
    if (extra.length) throw new Error('Usage: release-audit.mjs [private-evidence-directory]');
    runAudit(
      directory ??
        join(
          homedir(),
          '.roberdan-os/private/mirrorbuddy',
          `release-audit-${Date.now()}-${process.pid}`,
        ),
    );
  } catch (error) {
    console.error('audit FAILED:', error instanceof Error ? error.message : 'invalid audit');
    process.exitCode = 1;
  }
}
