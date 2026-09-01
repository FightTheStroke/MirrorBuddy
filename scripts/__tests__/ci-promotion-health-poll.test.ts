/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Regression guard for the promotion health poll in ci.yml.
 *
 * The apex domain 308-redirects to www (next.config.ts redirects()). When the
 * poll probed the apex with a plain `curl` it read 308, never 200, and failed a
 * healthy production after 15 minutes of waiting. Probing a redirect proves
 * nothing about the application.
 */
describe('CI promotion health poll', () => {
  // Anchored to this file, not to process.cwd(): vitest runs with its root at
  // apps/web while this test lives at the repo root, so cwd is not stable here.
  const workflow = readFileSync(
    fileURLToPath(new URL('../../.github/workflows/ci.yml', import.meta.url)),
    'utf8',
  );

  const probeLine = workflow.split('\n').find((line) => line.includes('health=$(curl'));

  it('has a health probe in the promotion poll', () => {
    expect(probeLine).toBeDefined();
  });

  it('probes the canonical www host, not the redirecting apex', () => {
    expect(probeLine).toContain('https://www.mirrorbuddy.org/api/health');
  });

  it('follows redirects so a 308 cannot be mistaken for an outage', () => {
    expect(probeLine).toMatch(/curl\s+-[a-zA-Z]*L/);
  });

  it('never points production URLs at a dead or non-canonical domain', () => {
    const forbidden = [
      'https://mirrorbuddy.app',
      'https://mirrorbuddy.it',
      'https://mirrorbuddy.com',
      'https://mirrorbuddy.eu',
    ];

    for (const domain of forbidden) {
      expect(workflow).not.toContain(domain);
    }
  });
});
