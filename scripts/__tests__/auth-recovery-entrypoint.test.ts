// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('conditioned recovery entrypoints reject untrusted invocation without DB access', () => {
  it.each(['readonly-recovery.ts', 'student-smoke-session.ts'])(
    '%s is hermetic and sanitized',
    (script) => {
      const secret = 'synthetic-entrypoint-secret-canary';
      const result = spawnSync('pnpm', ['run', 'script', '--', `scripts/${script}`], {
        cwd: resolve(__dirname, '../..'),
        encoding: 'utf8',
        timeout: 20_000,
        env: {
          HOME: process.env.HOME,
          PATH: process.env.PATH,
          NODE_ENV: 'test',
          DOTENV_CONFIG_PATH: '/dev/null',
          DATABASE_URL: '',
          DIRECT_URL: '',
          ADMIN_PASSWORD: secret,
          PROD_TEST_USER_PASSWORD: secret,
        },
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('_FAILED');
      expect(result.stdout + result.stderr).not.toMatch(/Prisma|Client Component/);
      expect(result.stdout + result.stderr).not.toContain(secret);
    },
    25_000,
  );
});
