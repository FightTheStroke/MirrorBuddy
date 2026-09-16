// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const syntheticEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  PATH: process.env.PATH,
  TMPDIR: process.env.TMPDIR,
  DOTENV_CONFIG_PATH: '/dev/null',
};

describe('production checker process failure propagation', () => {
  it('local CI preview build declares its target instead of assuming Vercel system variables exist', () => {
    const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');
    const staging = workflow.split('\n  deploy-to-staging:')[1];
    const build = staging.match(/- name: Build Project\n([\s\S]*?)(?=\n      - name:)/)?.[1] ?? '';
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/check-production-env.ts', 'build'],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 5_000,
        env: {
          ...syntheticEnv,
          DATABASE_URL: 'synthetic-preview-db',
          VERCEL_ENV: build.match(/VERCEL_ENV: (\w+)/)?.[1],
          VERCEL_TARGET_ENV: build.match(/VERCEL_TARGET_ENV: (\w+)/)?.[1],
        },
      },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('preview environment values verified');
    expect(build).toContain('vercel build --target=preview');
  });

  it('exits nonzero for missing source identity before launching external commands', () => {
    const result = spawnSync(process.execPath, ['scripts/deploy-validated-production.mjs'], {
      cwd: root,
      env: syntheticEnv,
      encoding: 'utf8',
      timeout: 5_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid GITHUB_SHA');
    expect(result.stdout).toBe('');
  });

  it('explicit production validation still requires production-only values on a preview host', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/check-production-env.ts', 'values'],
      {
        cwd: root,
        env: { ...syntheticEnv, VERCEL_ENV: 'preview' },
        encoding: 'utf8',
        timeout: 5_000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SESSION_SECRET');
    expect(result.stdout).toBe('');
  });
});
