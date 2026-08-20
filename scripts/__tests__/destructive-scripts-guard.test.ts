/**
 * @vitest-environment node
 *
 * Guard for the destructive repo-root scripts.
 *
 * These scripts used to call their entry function at module scope, so simply
 * importing one executed it, and they deleted by default with `--dry-run` as
 * an opt-in. That combination came within one environment variable of wiping
 * production during an audit of this very directory.
 *
 * This test reads the source rather than importing it — for exactly the reason
 * above — and fails if a script that deletes data ever loses its rail.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPTS_DIR = join(process.cwd(), 'scripts');

const DELETES = /prisma\.\w+\.delete(Many)?\(|\$executeRaw[\s\S]{0,80}(DELETE|TRUNCATE|DROP)/i;

function destructiveScripts(): Array<{ name: string; source: string }> {
  return readdirSync(SCRIPTS_DIR)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({ name: file, source: readFileSync(join(SCRIPTS_DIR, file), 'utf8') }))
    .filter(({ source }) => DELETES.test(source));
}

describe('destructive root scripts', () => {
  const scripts = destructiveScripts();

  it('finds the destructive scripts it is meant to protect', () => {
    expect(scripts.length).toBeGreaterThan(0);
  });

  it.each(scripts)('$name never executes on import', ({ source }) => {
    expect(source).toContain('isDirectInvocation(import.meta.url)');
  });

  it.each(scripts)('$name deletes only when given --confirm', ({ source }) => {
    expect(source).toContain('announceMode(');
  });

  it.each(scripts)('$name does not treat deletion as the default', ({ name, source }) => {
    const optsInToSafety = /const isDryRun = process\.argv\.includes\(['"]--dry-run['"]\)/.test(source);

    expect(
      optsInToSafety,
      `${name} resolves dry-run itself, so LIVE DELETE is the default again`,
    ).toBe(false);
  });
});
