// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dockerfile = readFileSync(new URL('../../Dockerfile', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const install = dockerfile.indexOf('RUN pnpm install --frozen-lockfile');

describe('Docker workspace dependency handoff', () => {
  it('uses the repository pnpm configuration during dependency installation', () => {
    const configuration = dockerfile.search(/^COPY[^\n]*\.npmrc[^\n]*\.\/$/m);

    expect(configuration).toBeGreaterThanOrEqual(0);
    expect(configuration).toBeLessThan(install);
  });

  it('includes the app workspace manifest before installing the lockfile', () => {
    const manifest = dockerfile.indexOf('COPY apps/web/package.json ./apps/web/package.json');

    expect(manifest).toBeGreaterThanOrEqual(0);
    expect(manifest).toBeLessThan(install);
  });

  it('preserves installed workspace dependencies rather than only root node_modules', () => {
    expect(dockerfile).toMatch(/^COPY --from=deps \/app\/ \.\/$/m);
    expect(dockerfile.indexOf('COPY --from=deps /app/ ./')).toBeLessThan(
      dockerfile.indexOf('COPY . .'),
    );
  });

  it('checks Docker on configuration-changing PRs before they reach main', () => {
    const job = workflow.slice(
      workflow.indexOf('  docker:\n'),
      workflow.indexOf('  performance:\n'),
    );

    expect(job).toContain('needs: [detect-changes]');
    expect(job).toContain(
      "if: github.event_name != 'pull_request' || needs.detect-changes.outputs.config == 'true'",
    );
    for (const input of ['Dockerfile', '.dockerignore', '.npmrc', 'pnpm-workspace.yaml']) {
      expect(workflow).toContain(`              - '${input}'`);
    }
  });

  it('excludes host dependencies, build output and credentials from the source overlay', () => {
    const ignored = readFileSync(new URL('../../.dockerignore', import.meta.url), 'utf8').split(
      /\r?\n/,
    );

    expect(ignored).toEqual(
      expect.arrayContaining(['.git', '**/node_modules', '**/.next', '**/.env*', '**/.vercel']),
    );
  });
});
