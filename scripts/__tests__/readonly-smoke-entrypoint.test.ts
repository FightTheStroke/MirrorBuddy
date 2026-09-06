// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = {
  NODE_ENV: 'test',
  HOME: process.env.HOME,
  PATH: process.env.PATH,
  DOTENV_CONFIG_PATH: '/dev/null',
  SESSION_SECRET: 'synthetic-launcher-canary-not-a-real-credential',
} satisfies NodeJS.ProcessEnv;
const script = 'scripts/readonly-smoke-session.ts';

describe('actual conditioned readonly CLI entrypoint, hermetic rejection only', () => {
  it('runs through the existing launcher and fails before DB imports on missing arguments', () => {
    const result = spawnSync('pnpm', ['run', 'script', '--', script], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 20_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('INVALID_ARGUMENTS');
    expect(result.stderr).not.toContain('Prisma');
    expect((result.stdout + result.stderr).includes(env.SESSION_SECRET)).toBe(false);
  });
  it('rejects production authority before importing or connecting to any database', () => {
    const result = spawnSync(
      'pnpm',
      [
        'run',
        'script',
        '--',
        script,
        'issue',
        '--target',
        'production',
        '--directory',
        join(tmpdir(), 'readonly-smoke-entry'),
      ],
      { cwd: root, env, encoding: 'utf8', timeout: 20_000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('INVALID_TARGET');
    expect(result.stderr).not.toContain('Prisma');
    expect((result.stdout + result.stderr).includes(env.SESSION_SECRET)).toBe(false);
  });
  it('refuses bare tsx without the react-server condition', () => {
    const result = spawnSync(
      process.execPath,
      [join(root, 'node_modules/tsx/dist/cli.mjs'), script],
      { cwd: root, env, encoding: 'utf8', timeout: 20_000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('cannot be imported from a Client Component');
  });
});
