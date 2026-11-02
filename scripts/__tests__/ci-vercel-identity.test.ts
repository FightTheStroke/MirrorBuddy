// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const workflow = readFileSync(join(repository, '.github/workflows/ci.yml'), 'utf8');
const sentryJob = workflow.split('\n  sentry-config:')[1]?.split('\n  smoke-tests:')[0] ?? '';
const metadataJob =
  workflow.split('\n  production-metadata:')[1]?.split('\n  sentry-config:')[0] ?? '';
const roots: string[] = [];

// Git environment inherited from a hook would redirect the resolver's fallback to the
// real repository, which does have a project link. A fresh checkout has none.
function isolatedEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('GIT_') || value === undefined) continue;
    env[key] = value;
  }
  return { ...env, VERCEL_PROJECT_ID: '', VERCEL_ORG_ID: '', ...extra, NODE_ENV: 'test' };
}

function freshCheckout() {
  const root = mkdtempSync(join(tmpdir(), 'mb-fresh-checkout-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts/lib'), { recursive: true });
  copyFileSync(
    join(repository, 'scripts/lib/vercel-link.sh'),
    join(root, 'scripts/lib/vercel-link.sh'),
  );
  const init = spawnSync('git', ['init', '--quiet'], {
    cwd: root,
    encoding: 'utf8',
    env: isolatedEnv(),
  });
  expect(init.status, init.stderr).toBe(0);
  return root;
}

function resolveIn(root: string, identity: Record<string, string>) {
  return spawnSync(
    'bash',
    [
      '-c',
      'source "$1/scripts/lib/vercel-link.sh"; resolve_vercel_cwd "$1"',
      'resolve-fresh-checkout',
      root,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
      env: isolatedEnv(identity),
    },
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Vercel project identity in the CI Sentry configuration check', () => {
  it('requires authenticated production metadata before trusted integration and deployment', () => {
    expect(metadataJob).toContain('github.event.pull_request.base.sha || github.sha');
    expect(metadataJob).toContain('pnpm install --frozen-lockfile --ignore-scripts');
    expect(metadataJob).toContain('scripts/check-production-env.ts release-metadata');
    expect(metadataJob).toContain('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}');
    expect(metadataJob).toContain('VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID }}');
    expect(metadataJob).toContain('VERCEL_ORG_ID: ${{ vars.VERCEL_ORG_ID }}');
    expect(metadataJob).toContain('exit 1');
    for (const name of ['pr-gate', 'deployment-gate']) {
      const gate = workflow.split(`\n  ${name}:`)[1]?.split('\n  # ====')[0] ?? '';
      expect(gate).toContain('- production-metadata');
      expect(gate).toContain("needs.production-metadata.result != 'success'");
      expect(gate).toContain("needs.production-metadata.result == 'success'");
    }
  });

  it('supplies the project identity to the script that resolves the linked project', () => {
    const step = sentryJob
      .split('- name: Verify Sentry configuration against Vercel production env')[1]
      ?.split('- name:')[0];
    expect(step).toBeDefined();
    expect(step).toContain('VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID }}');
    expect(step).toContain('VERCEL_ORG_ID: ${{ vars.VERCEL_ORG_ID }}');
  });

  it('fails the job with an actionable message when the identity variables are absent', () => {
    expect(sentryJob).toContain('- name: Validate Vercel project identity is set');
    const guard = sentryJob
      .split('- name: Validate Vercel project identity is set')[1]
      ?.split('- name:')[0];
    expect(guard).toContain('VERCEL_PROJECT_ID: ${{ vars.VERCEL_PROJECT_ID }}');
    expect(guard).toContain('VERCEL_ORG_ID: ${{ vars.VERCEL_ORG_ID }}');
    expect(guard).toContain('exit 1');
  });

  it('cannot resolve a fresh checkout that has no project link and no identity', () => {
    const result = resolveIn(freshCheckout(), {});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No Vercel project link or explicit project identity');
  });

  it('resolves the same fresh checkout once the identity is supplied', () => {
    const root = freshCheckout();
    const result = resolveIn(root, {
      VERCEL_PROJECT_ID: 'prj_synthetic',
      VERCEL_ORG_ID: 'team_synthetic',
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe(root);
  });
});
