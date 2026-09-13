// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { z } from 'zod';

const state = vi.hoisted(() => {
  const disconnect = vi.fn();
  return { disconnect, client: { $disconnect: disconnect }, createClient: vi.fn(), seed: vi.fn() };
});

vi.mock('../../apps/web/src/lib/ssl-config', () => ({ createPrismaClient: state.createClient }));
vi.mock('../../apps/web/src/lib/seeds/tier-seed', () => ({ seedTiers: state.seed }));
vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $disconnect = state.disconnect;
  },
}));

const repository = process.cwd();
const previousExitCode = process.exitCode;
const tiers = {
  trial: { code: 'trial', availableMaestri: [] },
  base: { code: 'base', availableMaestri: ['one'] },
  pro: { code: 'pro', availableMaestri: ['one', 'two'] },
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic@127.0.0.1:9/unused');
  state.createClient.mockReturnValue(state.client);
  state.disconnect.mockResolvedValue(undefined);
  state.seed.mockResolvedValue(tiers);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  process.exitCode = undefined;
});

afterEach(() => {
  process.exitCode = previousExitCode;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('root command entry points', () => {
  const { scripts } = z
    .object({ scripts: z.record(z.string(), z.string()) })
    .parse(JSON.parse(readFileSync(resolve(repository, 'package.json'), 'utf8')));

  it('uses the actual app Playwright configuration for locale checks', () => {
    expect(scripts['test:e2e:i18n']).toContain('--config apps/web/playwright.config.iteration.ts');
    expect(existsSync(resolve(repository, 'apps/web/playwright.config.iteration.ts'))).toBe(true);
  });

  it('loads optional root environment configuration and the real standalone seed', () => {
    expect(scripts['seed:tiers']).toBe(
      'tsx --env-file-if-exists=.env apps/web/prisma/seed-tiers.ts',
    );
    expect(existsSync(resolve(repository, 'apps/web/prisma/seed-tiers.ts'))).toBe(true);
  });

  it('scans the relocated application for module boundaries', () => {
    expect(scripts['lint:boundaries']).toContain(' apps/web/src/');
    expect(scripts['lint:boundaries']).not.toContain("]' src/");
  });

  it('does not instantiate the adapterless Prisma client or exit before cleanup', () => {
    const source = readFileSync(resolve(repository, 'apps/web/prisma/seed-tiers.ts'), 'utf8');
    expect(source).not.toContain('new PrismaClient(');
    expect(source).not.toMatch(/process\.exit\(/);
  });

  it.each(['direct', 'symlink'])(
    'executes the actual CLI through a %s path',
    (mode) => {
      const directory = mkdtempSync(resolve(tmpdir(), 'mirrorbuddy-tier-cli-'));
      try {
        const source = resolve(repository, 'apps/web/prisma/seed-tiers.ts');
        const entry = mode === 'direct' ? source : resolve(directory, 'seed.ts');
        if (mode === 'symlink') symlinkSync(source, entry);
        const result = spawnSync('pnpm', ['exec', 'tsx', entry], {
          cwd: repository,
          encoding: 'utf8',
          env: { ...process.env, DATABASE_URL: '', DOTENV_CONFIG_PATH: '/dev/null' },
        });
        expect(result.status, result.stdout + result.stderr).toBe(1);
        expect(result.stderr).toContain('DATABASE_URL is required for tier seeding');
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
    30_000,
  );

  it.each([{ args: [] }, { args: ['not-a-seed-entry-47ba2c29'] }])(
    'does not execute the seed when imported with eval arguments $args',
    ({ args }) => {
      const result = spawnSync(
        'pnpm',
        [
          'exec',
          'tsx',
          '--eval',
          "import('./apps/web/prisma/seed-tiers.ts').then(() => console.log('imported'))",
          ...args,
        ],
        {
          cwd: repository,
          encoding: 'utf8',
          env: { ...process.env, DATABASE_URL: '', DOTENV_CONFIG_PATH: '/dev/null' },
        },
      );
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(result.stdout.trim()).toBe('imported');
      expect(result.stderr).not.toContain('Tier seed failed');
    },
    30_000,
  );
});

describe('standalone tier seed lifecycle', () => {
  async function loadRunner() {
    const entrypoint = await import('../../apps/web/prisma/seed-tiers');
    expect(typeof entrypoint.runTierSeed).toBe('function');
    return entrypoint.runTierSeed;
  }

  it('uses the configured factory and single seed definition, then disconnects', async () => {
    const run = await loadRunner();
    await run();
    expect(state.createClient).toHaveBeenCalledWith(process.env.DATABASE_URL);
    expect(state.seed).toHaveBeenCalledExactlyOnceWith(state.client);
    expect(state.disconnect).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  it('reports seed failure only after releasing the client', async () => {
    const run = await loadRunner();
    const error = new Error('synthetic seed failure');
    state.seed.mockRejectedValue(error);
    await run();
    expect(state.disconnect).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('Tier seed failed:', error);
    expect(state.disconnect.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(console.error).mock.invocationCallOrder[0],
    );
    expect(process.exitCode).toBe(1);
  });

  it('reports disconnection failure without an unhandled rejection', async () => {
    const run = await loadRunner();
    const error = new Error('synthetic disconnect failure');
    state.disconnect.mockRejectedValue(error);
    await run();
    expect(console.error).toHaveBeenCalledWith('Tier seed failed:', error);
    expect(process.exitCode).toBe(1);
  });

  it.each([new Error('seed failure'), undefined, null])(
    'preserves both causes when seeding and cleanup fail (seed rejection=%s)',
    async (seedFailure) => {
      const run = await loadRunner();
      const cleanupFailure = new Error('cleanup failure');
      state.seed.mockRejectedValue(seedFailure);
      state.disconnect.mockRejectedValue(cleanupFailure);
      await run();
      expect(state.disconnect).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('Tier seed failed:', expect.any(AggregateError));
      expect(console.error).toHaveBeenCalledWith(
        'Tier seed failed:',
        expect.objectContaining({ errors: [seedFailure, cleanupFailure] }),
      );
      expect(process.exitCode).toBe(1);
    },
  );

  it('fails explicitly without selecting a fallback database', async () => {
    const run = await loadRunner();
    vi.stubEnv('DATABASE_URL', '');
    await run();
    expect(state.createClient).not.toHaveBeenCalled();
    expect(state.seed).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      'Tier seed failed:',
      expect.objectContaining({ message: 'DATABASE_URL is required for tier seeding' }),
    );
  });

  it('handles configured client construction failure', async () => {
    const run = await loadRunner();
    const error = new Error('synthetic adapter failure');
    state.createClient.mockImplementation(() => {
      throw error;
    });
    await run();
    expect(state.seed).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Tier seed failed:', error);
    expect(process.exitCode).toBe(1);
  });
});
