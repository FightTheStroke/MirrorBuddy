/**
 * @vitest-environment node
 *
 * Contract for scripts/seed-admin.ts.
 *
 * The admin password in the environment only reaches production if this script
 * runs and finds the account. It used to look the account up by plaintext
 * `email` while the login route looks it up by `emailHash`, and it never wrote
 * `emailHash` at all — so a seeded account could be invisible to login, and a
 * re-seed could create a duplicate instead of updating.
 *
 * These are source-level assertions: the script talks to a live database, so
 * the behaviour cannot be exercised in a unit test without one.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'scripts', 'seed-admin.ts'), 'utf8');

describe('scripts/seed-admin.ts', () => {
  it('derives emailHash with the same unsalted SHA-256 the login route uses', () => {
    expect(source).toContain("createHash('sha256')");
    expect(source).toContain("update(email, 'utf8')");
    expect(source).toContain("digest('hex')");
  });

  it('looks the account up by emailHash, not by plaintext email alone', () => {
    expect(source).toMatch(/OR:\s*\[\{\s*emailHash\s*\}/);
  });

  it('writes emailHash on both create and update, so login can find the account', () => {
    const writes = source.match(/emailHash,/g) ?? [];
    expect(writes.length).toBeGreaterThanOrEqual(2);
  });

  it('refuses to act when several accounts match, instead of guessing', () => {
    expect(source).toContain('refusing to guess');
    expect(source).toMatch(/matches\.length > 1/);
  });

  it('never deletes', () => {
    expect(source).not.toMatch(/\.delete\(|deleteMany/);
  });
});
