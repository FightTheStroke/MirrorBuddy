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
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const TSX = join(ROOT, 'node_modules', '.bin', 'tsx');

/** Guarded, and imports the server-only shim: it exercises both claims at once. */
const SAMPLE = join(ROOT, 'scripts', 'emergency-cleanup.ts');

function load(args: string[]): { ok: boolean; output: string } {
  try {
    const output = execFileSync(
      TSX,
      [...args, '-e', `import(${JSON.stringify(pathToFileURL(SAMPLE).href)})`],
      {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120_000,
        env: { ...process.env, DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/none' },
      },
    );

    return { ok: true, output };
  } catch (error) {
    const shell = error as { stdout?: string; stderr?: string };

    return { ok: false, output: `${shell.stdout ?? ''}${shell.stderr ?? ''}` };
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

  it('fails to load without the condition — the failure this repairs', () => {
    const { ok, output } = load([]);

    expect(ok).toBe(false);
    expect(output).toContain('server-only');
  });

  it('loads with the condition, and still does not execute on import', () => {
    const { ok, output } = load(['--conditions=react-server']);

    expect(ok, output).toBe(true);
    expect(output).not.toContain('EMERGENCY');
  });
});
