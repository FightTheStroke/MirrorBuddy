// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Every case here spawns real shell scripts; the 5s default is not a realistic
// budget for subprocess work and turns machine load into spurious failures.
vi.setConfig({ testTimeout: 30_000 });
import { criticalProductionEnv } from '../lib/production-env-policy';

const repository = resolve(import.meta.dirname, '../..');
const roots: string[] = [];
const names = [
  ...criticalProductionEnv.map(({ name }) => name),
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
];

function run(script: string, fail = false, keys = names) {
  const root = mkdtempSync(join(tmpdir(), 'mb-vercel-verifier-'));
  roots.push(root);
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const calls = join(root, 'calls.jsonl');
  const payload = JSON.stringify({
    envs: keys.map((key) => ({
      key,
      type: 'sensitive',
      target: ['production'],
    })),
  });
  writeFileSync(
    join(bin, 'vercel'),
    `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify(process.argv.slice(2)) + '\\n');
if (${fail} || process.argv[2] !== 'env' || process.argv[3] !== 'ls') {
  console.error('synthetic-private-canary'); process.exit(1);
}
process.stdout.write(${JSON.stringify(payload)});
`,
    { mode: 0o755 },
  );
  const result = spawnSync('bash', [join(repository, 'scripts', script)], {
    cwd: repository,
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      VERCEL_TOKEN: '',
      VERCEL_PROJECT_ID: 'prj_synthetic',
      VERCEL_ORG_ID: 'team_synthetic',
      CI: 'false',
      VERCEL_ENV: '',
      GITHUB_REF: '',
      DATABASE_URL: 'synthetic-local-value',
      NODE_ENV: 'test',
    },
  });
  return { ...result, calls: readFileSync(calls, 'utf8') };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
describe('production verifier wrappers', () => {
  it.each(['check-vercel-env.sh', 'verify-vercel-env.sh', 'verify-sentry-config.sh'])(
    '%s checks actual names without downloading secrets',
    (script) => {
      const result = run(script);
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(result.calls).toContain('"env","ls","production","--format=json"');
      expect(result.calls).not.toMatch(/pull|decrypt/);
    },
  );
  it.each(['check-vercel-env.sh', 'verify-vercel-env.sh', 'verify-sentry-config.sh'])(
    '%s fails closed without leaking a CLI error payload',
    (script) => {
      const result = run(script, true);
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).not.toContain('synthetic-private-canary');
      expect(result.calls.trim().split('\n')).toHaveLength(1);
    },
  );
  it('rejects an incomplete metadata response instead of inspecting an empty export', () => {
    const result = run('check-vercel-env.sh', false, []);
    expect(result.status).toBe(1);
    expect(result.calls).not.toContain('pull');
  });
});
