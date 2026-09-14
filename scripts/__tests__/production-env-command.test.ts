// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkProductionEnvironment } from '../check-production-env';
import { criticalProductionEnv } from '../lib/production-env-policy';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
const exec = vi.mocked(execFileSync);
const root = resolve(import.meta.dirname, '../..');
const source = (name: string) => readFileSync(resolve(root, name), 'utf8');
const injectedValues = () =>
  Object.fromEntries(criticalProductionEnv.map(({ name }) => [name, 'synthetic-value']));

beforeEach(() => {
  vi.clearAllMocks();
  exec.mockReturnValue(
    JSON.stringify({
      envs: criticalProductionEnv.map(({ name }) => ({
        key: name,
        type: 'sensitive',
        target: ['production'],
      })),
    }),
  );
});

describe('production environment command boundary', () => {
  it('lists production metadata only, with the resolved linked directory', () => {
    expect(checkProductionEnvironment(['metadata', root], {})).toEqual(
      'Production environment names verified; values are checked only in the deployment runtime.',
    );
    expect(exec).toHaveBeenCalledExactlyOnceWith(
      'vercel',
      ['env', 'ls', 'production', '--format=json', '--cwd', root],
      expect.objectContaining({ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    );
    expect(JSON.stringify(exec.mock.calls)).not.toMatch(/pull|decrypt|\.env/);
  });

  it.each(['CLI missing', 'authentication failed', 'unlinked project', 'timeout'])(
    'fails closed on %s, never leaking command output or falling back to a download',
    () => {
      exec.mockImplementation(() => {
        throw new Error('synthetic-private-marker');
      });
      expect(() => checkProductionEnvironment(['metadata', root], {})).toThrow(
        /^Unable to retrieve production environment metadata$/,
      );
      expect(exec).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['', 'not-json', 'null', '{}', '{"envs":[]}'])(
    'rejects invalid output (%s)',
    (output) => {
      exec.mockReturnValue(output);
      expect(() => checkProductionEnvironment(['metadata', root], {})).toThrow();
    },
  );

  it.each([[], ['unknown'], ['metadata'], ['values', 'extra']].map((args) => ({ args })))(
    'rejects invalid arguments (%j) without spawning a process',
    ({ args }) => {
      expect(() => checkProductionEnvironment(args, {})).toThrow();
      expect(exec).not.toHaveBeenCalled();
    },
  );

  it('validates injected values without loading dotenv or launching a process', () => {
    expect(checkProductionEnvironment(['values'], injectedValues())).toContain('values verified');
    expect(exec).not.toHaveBeenCalled();
    expect(source('scripts/check-production-env.ts')).not.toMatch(/dotenv|readFile|env pull/);
  });

  it('rejects corrupt values without logging them', () => {
    expect(() =>
      checkProductionEnvironment(['values'], {
        ...injectedValues(),
        SESSION_SECRET: 'synthetic-private-marker\\n',
      }),
    ).toThrow(/^SESSION_SECRET: missing, blank, or newline-corrupted value$/);
    expect(exec).not.toHaveBeenCalled();
  });
});

describe('existing publication and deployment wiring', () => {
  it('keeps the local registry covered by critical plus optional policy without reading .env', () => {
    const registry = source('scripts/pre-push-vercel.sh').match(
      /REQUIRED_VARS=\(([\s\S]*?)\)/,
    )?.[1];
    const optional = source('scripts/validate-pre-deploy.ts').match(
      /const optional = \[([\s\S]*?)\];/,
    )?.[1];
    expect(registry).toBeDefined();
    expect(optional).toBeDefined();
    const known = new Set([
      ...criticalProductionEnv.map(({ name }) => name),
      ...[...(optional ?? '').matchAll(/name: '([A-Z0-9_]+)'/g)].map((match) => match[1]),
    ]);
    const registered = [...(registry ?? '').matchAll(/"([A-Z0-9_]+)"/g)].map((match) => match[1]);
    expect(registered.filter((name) => !known.has(name))).toEqual([]);
  });

  it('retains all earlier pre-push phases, but cannot skip or download in phase five', () => {
    const script = source('scripts/pre-push-vercel.sh');
    const phase = script.split('# PHASE 5/5:')[1];
    expect(phase).toContain('check-production-env.ts" metadata "$VERCEL_CWD"');
    expect(phase).not.toMatch(/env pull|SKIP_VERCEL_ENV_CHECK|skipping|env vars OK/);
    for (const marker of [
      'check-schema-drift.sh',
      'npx prisma generate',
      'npm run build',
      'acquire_build_lock',
      'REQUIRED_VARS=(',
      'done <.env',
    ])
      expect(script).toContain(marker);
  });

  it('checks injected values before the existing Vercel build pipeline', () => {
    const config = JSON.parse(source('vercel.json')) as { buildCommand?: string };
    expect(config.buildCommand).toBe('tsx scripts/build-with-production-proof.ts');
    const wrapper = source('scripts/build-with-production-proof.ts');
    expect(wrapper.indexOf("checkProductionEnvironment(['build'], process.env)")).toBeLessThan(
      wrapper.indexOf("spawnSync('npm', ['run', 'vercel-build']"),
    );
    const pkg = JSON.parse(source('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts['vercel-build']).toBe(
      'prisma generate && prisma migrate deploy && npm run build',
    );
  });

  it('preserves the existing pre-deploy checks and rejects corrupt values before DB/logging', () => {
    const script = source('scripts/validate-pre-deploy.ts');
    expect(script).toContain('validateProductionValues(process.env)');
    expect(script.indexOf('const valueFailures =')).toBeLessThan(
      script.indexOf('// Validate Sentry DSN'),
    );
    for (const check of [
      'validateSentryDSN(',
      'validateSentryClientFallback(',
      'validateVercelToken(',
      'validateVercelRegionCompliance(',
      'validateCriticalEnvVars(',
      'validateOptionalEnvVars(',
      'await validateVectorSearch()',
    ])
      expect(script).toContain(check);
  });
});
