/**
 * The repo-root scripts/ test folder lives above the vite root (apps/web).
 * Under the default jsdom environment vitest cannot load a file above its
 * root: it fails collection with `Cannot find module '/@fs/...'` before a
 * single assertion runs. Four test files sat excluded for exactly that
 * reason, believed active, protecting nothing.
 *
 * A missing docblock is silent, so this guard makes it loud.
 *
 * @vitest-environment node
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testsDir = dirname(fileURLToPath(import.meta.url));

const NODE_ENVIRONMENT_DOCBLOCK = '@vitest-environment node';

function rootTestFiles(): string[] {
  return readdirSync(testsDir)
    .filter((file) => file.endsWith('.test.ts'))
    .sort();
}

describe('repo-root script tests', () => {
  it('finds the root test files', () => {
    expect(rootTestFiles().length).toBeGreaterThan(0);
  });

  it.each(rootTestFiles())('%s declares the node environment', (file) => {
    const source = readFileSync(join(testsDir, file), 'utf8');

    expect(source).toContain(NODE_ENVIRONMENT_DOCBLOCK);
  });
});
