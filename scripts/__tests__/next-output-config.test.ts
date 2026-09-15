// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const readConfig = `
  const config = require(process.argv[1]).default;
  process.stdout.write(JSON.stringify({
    output: config.output,
    tracingRoot: config.outputFileTracingRoot,
  }));
`;

describe('Next.js deployment output', () => {
  it.each([
    ['Vercel production', { VERCEL: '1', VERCEL_ENV: 'production' }, undefined],
    ['Vercel preview', { VERCEL: '1', VERCEL_ENV: 'preview' }, undefined],
    ['Vercel without a target name', { VERCEL: '1' }, undefined],
    ['Docker and local builds', {}, 'standalone'],
    ['a local preview build', { VERCEL_ENV: 'preview' }, 'standalone'],
    ['a disabled Vercel flag', { VERCEL: '0', VERCEL_ENV: 'production' }, 'standalone'],
  ] satisfies [string, Record<string, string>, string | undefined][])(
    'selects the output for %s and preserves the monorepo tracing root',
    (_name, environment, output) => {
      // Isolate Next/plugin caches and inherited deployment credentials between cases.
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          join(repository, 'node_modules/tsx/dist/loader.mjs'),
          '-e',
          readConfig,
          join(repository, 'apps/web/next.config.ts'),
        ],
        {
          cwd: repository,
          encoding: 'utf8',
          timeout: 30_000,
          env: {
            NODE_ENV: 'production',
            NEXT_TELEMETRY_DISABLED: '1',
            ...environment,
          },
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      const config: { output?: string; tracingRoot: string } = JSON.parse(result.stdout);
      expect(config.output).toBe(output);
      expect(config.tracingRoot).toBe(repository);
    },
  );
});
