// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildFixture, productionValues } from './production-build-fixture';

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  PATH: process.env.PATH ?? '/usr/bin:/bin',
  TMPDIR: process.env.TMPDIR,
  DOTENV_CONFIG_PATH: '/dev/null',
};
const values = () => ({
  ...baseEnv,
  ...productionValues(),
});

function buildBoundary(env: NodeJS.ProcessEnv, buildStatus = 0) {
  const fixture = buildFixture();
  try {
    return fixture.build(env, buildStatus);
  } finally {
    fixture.clean();
  }
}

describe('trusted build runtime enforces validation before external build work', () => {
  it.each(['preview', 'development'])(
    'allows %s with only resident preview database values, not production-only secrets',
    (target) => {
      const result = buildBoundary({
        ...baseEnv,
        VERCEL_ENV: target,
        DATABASE_URL: 'synthetic-db',
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('BUILD_REQUESTED');
    },
  );

  it('rejects corrupt resident preview values before build', () => {
    const result = buildBoundary({
      ...baseEnv,
      VERCEL_ENV: 'preview',
      DATABASE_URL: 'synthetic-db\\n',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DATABASE_URL');
    expect(result.stdout).not.toContain('BUILD_REQUESTED');
  });

  it.each([undefined, '', 'staging', 'PRODUCTION'])(
    'fails closed for unknown or absent build target (%j)',
    (target) => {
      const result = buildBoundary({ ...values(), VERCEL_ENV: target, VERCEL_TARGET_ENV: target });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('target');
      expect(result.stdout).not.toContain('BUILD_REQUESTED');
    },
  );

  it('rejects contradictory Vercel target metadata', () => {
    const result = buildBoundary({ ...values(), VERCEL_TARGET_ENV: 'preview' });
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('BUILD_REQUESTED');
  });

  it('requires every critical production value, not only resident ones', () => {
    const result = buildBoundary({
      ...baseEnv,
      VERCEL_ENV: 'production',
      DATABASE_URL: 'synthetic-db',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SESSION_SECRET');
    expect(result.stdout).not.toContain('BUILD_REQUESTED');
  });

  it('allows a valid injected environment to reach the existing build boundary', () => {
    const result = buildBoundary(values());
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('values verified');
    expect(result.stdout).toContain('BUILD_REQUESTED');
  });

  it.each(['', ' ', 'synthetic-private-marker\\n', 'synthetic-private-marker\n'])(
    'blocks malformed values before any build or migration (%j)',
    (value) => {
      const result = buildBoundary({ ...values(), SESSION_SECRET: value });
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).not.toMatch(/BUILD_REQUESTED|synthetic-private-marker/);
      expect(result.stderr).toContain('SESSION_SECRET');
    },
  );

  it('rejects optional config corruption without logging the config value', () => {
    const result = buildBoundary({ ...values(), DEFAULT_CHAT_MODEL: 'synthetic-config-marker\\n' });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toMatch(/BUILD_REQUESTED|synthetic-config-marker/);
    expect(result.stderr).toContain('DEFAULT_CHAT_MODEL');
  });

  it('retains a failing build exit after successful validation', () => {
    const result = buildBoundary(values(), 23);
    expect(result.status).toBe(23);
    expect(result.stdout).toContain('BUILD_REQUESTED');
  });

  it('fails loudly with no injected environment and does not try to load one', () => {
    const result = buildBoundary(baseEnv);
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('BUILD_REQUESTED');
    expect(result.stderr).toContain('target');
  });
});
