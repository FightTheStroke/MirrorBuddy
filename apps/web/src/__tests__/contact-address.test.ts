/**
 * @vitest-environment node
 *
 * One public address, and only one.
 *
 * Contact addresses had drifted into four: `compliance@mirrorbuddy.it`,
 * `support@mirrorbuddy.it`, `info@fightthestroke.org`, and — live in
 * production until 30 August 2026 — the misspelling `info@fighttestroke.org`,
 * a domain that does not exist. Everything sent there was lost silently.
 *
 * These addresses appear in privacy, terms, accessibility and AI-transparency
 * pages that families are told to write to, so a wrong one is not cosmetic.
 * Roberto's instruction: always and only `info@fightthestroke.org`.
 *
 * Internal alerts are a different matter — those go to the administrators in
 * the database (see `lib/admin/admin-recipients.ts`) and are not covered here.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_ADDRESS = 'info@fightthestroke.org';

/** Addresses that must never appear again in user-facing text. */
const FORBIDDEN = ['info@fighttestroke.org', 'compliance@mirrorbuddy.it', 'support@mirrorbuddy.it'];

// Vitest may run from the repository root or from the app directory; resolve
// both so this guard cannot silently end up scanning an empty tree.
const APP_DIR = existsSync(join(process.cwd(), 'src', 'app'))
  ? process.cwd()
  : join(process.cwd(), 'apps', 'web');
const ROOTS = ['src', 'messages'];
const SKIP_DIRS = new Set(['node_modules', '__tests__', '.next', 'dist']);
const EXTENSIONS = /\.(ts|tsx|json)$/;

function collectFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, out);
    else if (EXTENSIONS.test(entry)) out.push(full);
  }
  return out;
}

const FILES = ROOTS.flatMap((r) => collectFiles(join(APP_DIR, r)));

function filesContaining(needle: string): string[] {
  return FILES.filter((f) => readFileSync(f, 'utf-8').includes(needle));
}

describe('public contact address', () => {
  it.each(FORBIDDEN)('%s appears nowhere in user-facing text', (address) => {
    const offenders = filesContaining(address).filter(
      (f) => !f.endsWith('admin-recipients.ts') && !f.includes('contact-address'),
    );
    expect(offenders).toEqual([]);
  });

  it('actually reads the source tree, instead of quietly checking nothing', () => {
    expect(FILES.length).toBeGreaterThan(100);
  });

  it('the association address is still present where families are told to write', () => {
    expect(filesContaining(PUBLIC_ADDRESS).length).toBeGreaterThan(0);
  });
});
