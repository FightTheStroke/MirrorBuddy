// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { availableParallelism } from 'node:os';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('unit worker budget', () => {
  it.each([
    ['', Math.min(4, availableParallelism())],
    ['true', undefined],
  ] as const)('bounds local work without changing CI parallelism (CI=%s)', async (ci, expected) => {
    vi.stubEnv('CI', ci);
    vi.resetModules();
    const { default: config } = await import('../../apps/web/vitest.config');
    expect(config.test?.maxWorkers).toBe(expected);
    expect(config.test?.fileParallelism).toBe(true);
  });
});
