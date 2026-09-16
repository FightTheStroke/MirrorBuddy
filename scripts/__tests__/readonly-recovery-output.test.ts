// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { recoveryFailureCodes } from '../lib/readonly-recovery-diagnostics';

const workflow = parse(
  readFileSync(resolve(__dirname, '../../.github/workflows/readonly-recovery.yml'), 'utf8'),
);
const run = workflow.jobs.recover.steps.at(-1).run;
function execute(output: string, exit: number, action = 'report', confirm = '') {
  return spawnSync(
    'bash',
    [
      '-euo',
      'pipefail',
      '-c',
      `
    pnpm() { printf '%s\\n' "$FIXTURE_OUTPUT"; return "$FIXTURE_EXIT"; }
    ${run}
  `,
    ],
    {
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        PATH: process.env.PATH,
        FIXTURE_OUTPUT: output,
        FIXTURE_EXIT: String(exit),
        ACTION: action,
        CONFIRM: confirm,
      },
    },
  );
}
describe('actual credential-bearing workflow output filter', () => {
  it.each(['CONVERSION_REQUIRED', 'ALREADY_READY', 'CONVERTED'])(
    'forwards a single success %s',
    (code) => {
      const result = execute(`secret noise\nREADONLY_RECOVERY_${code}`, 0);
      expect(result.status).toBe(0);
      expect(result.stdout).toBe(`READONLY_RECOVERY_${code}\n`);
      expect(result.stderr).toBe('');
    },
  );
  it.each(recoveryFailureCodes)('forwards only fixed failure %s', (code) => {
    const result = execute(`secret noise\nREADONLY_RECOVERY_${code}`, 1);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(`::error::READONLY_RECOVERY_${code}\n`);
    expect(result.stderr).toBe('');
  });
  it.each([
    ['', 0],
    ['READONLY_RECOVERY_OWNER_REJECTED', 0],
    ['READONLY_RECOVERY_CONVERTED', 1],
    ['READONLY_RECOVERY_CONVERTED\nREADONLY_RECOVERY_CONVERTED', 0],
    ['READONLY_RECOVERY_CONVERTED\nREADONLY_RECOVERY_DISCONNECT_FAILED', 1],
    ['READONLY_RECOVERY_OWNER_REJECTED\nREADONLY_RECOVERY_ACCOUNT_REJECTED', 1],
    ['READONLY_RECOVERY_OWNER_REJECTED secret', 1],
    ['prefix READONLY_RECOVERY_OWNER_REJECTED', 1],
    ['READONLY_RECOVERY_PASSWORD=secret', 1],
    ['::error::secret\nREADONLY_RECOVERY_OWNER_REJECTED\r', 1],
  ] as const)(
    'rejects missing, ambiguous, inconsistent or malicious output %j (exit %s)',
    (output, exit) => {
      const result = execute(output, exit);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('::error::READONLY_RECOVERY_STATUS_REJECTED\n');
      expect(result.stderr).toBe('');
    },
  );
  it('retains exact conversion confirmation and never invokes the process on rejection', () => {
    expect(execute('secret', 0, 'convert', 'yes').stdout).toBe(
      '::error::READONLY_RECOVERY_CONFIRMATION_REJECTED\n',
    );
  });
});
