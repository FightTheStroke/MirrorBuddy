/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Regression guard for the promotion health poll invoked by ci.yml.
 *
 * The apex domain 308-redirects to www (next.config.ts redirects()). When the
 * old poll probed the apex it read 308, never 200, and failed a healthy
 * production. The source-deployment helper now probes www directly and
 * rejects redirects: neither a redirect nor another deployment proves health.
 */
describe('CI promotion health poll', () => {
  // Anchored to this file, not to process.cwd(): vitest runs with its root at
  // apps/web while this test lives at the repo root, so cwd is not stable here.
  const workflow = readFileSync(
    fileURLToPath(new URL('../../.github/workflows/ci.yml', import.meta.url)),
    'utf8',
  );

  const deployment = readFileSync(
    fileURLToPath(new URL('../deploy-validated-production.mjs', import.meta.url)),
    'utf8',
  );
  const probeLine = deployment
    .split('\n')
    .find((line) => line.includes('const health = await fetch('));

  it('has a health probe in the promotion poll', () => {
    expect(workflow).toContain('run: node scripts/deploy-validated-production.mjs');
    expect(probeLine).toBeDefined();
  });

  it('probes the canonical www host, not the redirecting apex', () => {
    expect(probeLine).toContain('https://www.mirrorbuddy.org/api/health');
  });

  it('requires a direct healthy response instead of accepting redirect evidence', () => {
    expect(deployment).toContain("redirect: 'error'");
    expect(deployment).toContain('if (health.status === 200)');
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
      expect(deployment).not.toContain(domain);
    }
  });
});
