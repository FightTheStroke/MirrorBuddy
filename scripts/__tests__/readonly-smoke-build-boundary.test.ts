// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readRootScripts } from './readonly-smoke-workflow-fixtures';

const stages = ['prisma generate', 'prisma migrate deploy', 'npm run build'];

function runBuildBoundary(failure = '') {
  const directory = mkdtempSync(join(tmpdir(), 'mirrorbuddy-build-boundary-'));
  try {
    const log = join(directory, 'commands');
    writeFileSync(log, '');
    for (const program of ['prisma', 'npm']) {
      const executable = join(directory, program);
      writeFileSync(
        executable,
        `#!${process.execPath}
const { appendFileSync } = require('node:fs');
const step = ${JSON.stringify(program)} + ' ' + process.argv.slice(2).join(' ');
appendFileSync(process.env.FIXTURE_LOG, step + '\\n');
if (step === process.env.FIXTURE_FAILURE) process.exitCode = 23;
`,
      );
      chmodSync(executable, 0o700);
    }
    const result = spawnSync(
      'bash',
      ['-e', '-o', 'pipefail', '-c', readRootScripts()['vercel-build']],
      {
        encoding: 'utf8',
        env: {
          PATH: `${directory}:/usr/bin:/bin`,
          FIXTURE_LOG: log,
          FIXTURE_FAILURE: failure,
        },
      },
    );
    return { result, commands: readFileSync(log, 'utf8').trim().split('\n') };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('builds do not reconcile privileged accounts', () => {
  it('only generates, migrates and builds, without creating issuer eligibility', () => {
    const { result, commands } = runBuildBoundary();
    expect(result.status, result.stderr).toBe(0);
    expect(commands).toEqual(stages);
    expect(readRootScripts()['vercel-build']).not.toMatch(/seed:admin|readonly-smoke-session/);
  });

  it.each(stages)('preserves failure from %s and stops subsequent work', (failure) => {
    const { result, commands } = runBuildBoundary(failure);
    expect(result.status, result.stdout + result.stderr).toBe(23);
    expect(commands).toEqual(stages.slice(0, stages.indexOf(failure) + 1));
    expect(result.stdout + result.stderr).not.toContain('Admin seed skipped');
  });
});
