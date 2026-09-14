/**
 * @vitest-environment node
 *
 * The repo-root CLIs must actually run.
 *
 * Repairing their imports made `tsc` happy while every one of them still died
 * on the first line: the modules they now reach import `server-only`, which
 * throws unless Node is given the `react-server` condition. A green typecheck
 * was measuring the wrong thing — resolvable imports, not a working tool.
 *
 * The supported invocation is therefore `npm run script -- scripts/<name>.ts`,
 * which supplies that condition. This test proves the condition is both
 * necessary and sufficient, by loading a real script each way.
 */

import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const ROOT = process.cwd();
const TSX = join(ROOT, 'node_modules', '.bin', 'tsx');
const execFileAsync = promisify(execFile);
// Real tsx + Prisma cold starts measured 11.5s; this is not a 5s unit operation.
const IMPORT_TIMEOUT_MS = 15_000;
const PROCESS_TEST_TIMEOUT_MS = 20_000;
const IMPORT_COMPLETE = 'ROOT_SCRIPT_IMPORT_COMPLETE';

/** Guarded, and imports the server-only shim: it exercises both claims at once. */
const SAMPLE = join(ROOT, 'scripts', 'emergency-cleanup.ts');

async function load(args: string[]): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      TSX,
      [
        ...args,
        '-e',
        `import(${JSON.stringify(pathToFileURL(SAMPLE).href)})
          .then(() => console.log(${JSON.stringify(IMPORT_COMPLETE)}))
          .catch(error => { console.error(error); process.exitCode = 1; })`,
      ],
      {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: IMPORT_TIMEOUT_MS,
        env: { ...process.env, DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/none' },
      },
    );

    return { ok: true, output: `${stdout}${stderr}` };
  } catch (error) {
    const shell = error as { message?: string; stdout?: string; stderr?: string };

    return {
      ok: false,
      output: `${shell.message ?? ''}${shell.stdout ?? ''}${shell.stderr ?? ''}`,
    };
  }
}

describe('root scripts are runnable', () => {
  it('documents the invocation that supplies the react-server condition', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

    expect(pkg.scripts.script).toContain('--conditions=react-server');
  });

  it('never documents a bare npx tsx invocation, which cannot work', () => {
    const offenders = readdirSync(join(ROOT, 'scripts'))
      .filter((file) => file.endsWith('.ts'))
      .filter((file) =>
        /npx tsx scripts\//.test(readFileSync(join(ROOT, 'scripts', file), 'utf8')),
      );

    expect(offenders, 'these document an invocation that dies on server-only').toEqual([]);
  });

  it('fails to load without the condition — the failure this repairs', async () => {
    const { ok, output } = await load([]);

    expect(ok).toBe(false);
    expect(output).toContain('server-only');
    expect(output.split('\n')).not.toContain(IMPORT_COMPLETE);
  }, PROCESS_TEST_TIMEOUT_MS);

  it('loads with the condition, and still does not execute on import', async () => {
    const { ok, output } = await load(['--conditions=react-server']);

    expect(ok, output).toBe(true);
    expect(output).toContain(IMPORT_COMPLETE);
    expect(output).not.toContain('EMERGENCY');
  }, PROCESS_TEST_TIMEOUT_MS);
});
