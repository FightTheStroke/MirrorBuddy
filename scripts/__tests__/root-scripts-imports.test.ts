/**
 * The monorepo move relocated src/ under apps/web/, but the repo-root scripts/
 * kept importing `../src/...`. Nothing noticed: these scripts have no build
 * step and only two of them had tests, so the breakage surfaced only when
 * somebody reached for a tool — `npx tsx scripts/seed-admin.ts` died with
 * `Cannot find module '../src/lib/ssl-config'`. Several of them are emergency
 * tooling (seed-admin, rotate-keys, migrate-encrypt-pii, the cleanup-*
 * family), which is exactly when nobody has time to debug an import path.
 *
 * Importing these modules to check them is not an option: several call main()
 * at module scope, and some of those delete data. So this guard reads the
 * source instead of executing it.
 *
 * @vitest-environment node
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scriptsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PRE_MONOREPO_IMPORT = /from\s+['"]\.\.\/src\//;

function rootScripts(): string[] {
  return readdirSync(scriptsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .sort();
}

describe('repo-root scripts', () => {
  it('finds the scripts', () => {
    expect(rootScripts().length).toBeGreaterThan(0);
  });

  it.each(rootScripts())('%s does not import the pre-monorepo src/ path', (file) => {
    const source = readFileSync(join(scriptsDir, file), 'utf8');

    expect(source).not.toMatch(PRE_MONOREPO_IMPORT);
  });
});
