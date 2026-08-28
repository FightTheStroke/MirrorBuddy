/**
 * @vitest-environment node
 *
 * Contract test for the key rotation CLI.
 *
 * scripts/rotate-keys.ts imports its rotation functions from the security
 * module. The CLI's own unit test mocks that module, so a name mismatch
 * between the two files stays invisible there: the mock happily defines
 * whatever names the script asks for and the suite goes green while the real
 * script crashes at import time.
 *
 * The check is deliberately static — importing the security module for real
 * would pull in Prisma and the "@/" path aliases, a far heavier dependency
 * than a name contract needs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const SCRIPT_PATH = join(ROOT, 'scripts', 'rotate-keys.ts');
const MODULE_PATH = join(ROOT, 'apps', 'web', 'src', 'lib', 'security', 'key-rotation.ts');

function importedRotationNames(): string[] {
  const source = readFileSync(SCRIPT_PATH, 'utf8');
  const block = source.match(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*security\/key-rotation["']/);
  if (!block) {
    throw new Error('rotate-keys.ts no longer imports from security/key-rotation');
  }
  return block[1]
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

function exportedFunctionNames(): string[] {
  const source = readFileSync(MODULE_PATH, 'utf8');
  return [...source.matchAll(/^export (?:async )?function (\w+)/gm)].map((match) => match[1]);
}

describe('rotate-keys CLI contract', () => {
  it('imports only names the security module actually exports', () => {
    const exported = exportedFunctionNames();
    const missing = importedRotationNames().filter((name) => !exported.includes(name));
    expect(missing).toEqual([]);
  });

  it('covers every rotation type the CLI accepts', () => {
    expect(importedRotationNames().length).toBeGreaterThanOrEqual(3);
  });
});
