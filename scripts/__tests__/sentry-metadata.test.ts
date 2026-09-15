// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkProductionEnvironment } from '../check-production-env';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
const exec = vi.mocked(execFileSync);
const names = ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'];
const metadata = (keys = names, target = 'production') =>
  JSON.stringify({
    envs: keys.map((key) => ({ key, type: 'sensitive', target: [target] })),
  });
beforeEach(() => {
  vi.clearAllMocks();
  exec.mockReturnValue(metadata());
});
describe('Sentry names-only boundary', () => {
  it('verifies existing Sentry names without pulling values', () => {
    expect(checkProductionEnvironment(['sentry-metadata', '/linked'], {})).toContain(
      'Sentry environment names verified',
    );
    expect(exec).toHaveBeenCalledExactlyOnceWith(
      'vercel',
      ['env', 'ls', 'production', '--format=json', '--cwd', '/linked'],
      expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] }),
    );
  });
  it('supports an authenticated local CLI without demanding a new credential', () => {
    expect(() =>
      checkProductionEnvironment(['sentry-metadata', '/linked'], undefined),
    ).not.toThrow();
  });
  it('passes the existing supplied CLI credential explicitly', () => {
    checkProductionEnvironment(['sentry-metadata', '/linked'], { VERCEL_TOKEN: 'synthetic-token' });
    expect(exec.mock.calls[0][1]).toEqual([
      'env',
      'ls',
      'production',
      '--format=json',
      '--cwd',
      '/linked',
      '--token',
      'synthetic-token',
    ]);
  });
  it('accepts the server DSN alias already supported by the verifier', () => {
    exec.mockReturnValue(metadata(['SENTRY_DSN', ...names.slice(1)]));
    expect(() => checkProductionEnvironment(['sentry-metadata', '/linked'], {})).not.toThrow();
  });
  it.each(names)('rejects missing %s', (name) => {
    exec.mockReturnValue(metadata(names.filter((key) => key !== name)));
    expect(() => checkProductionEnvironment(['sentry-metadata', '/linked'], {})).toThrow(
      /Missing.*Sentry/,
    );
  });
  it('rejects preview names as production evidence', () => {
    exec.mockReturnValue(metadata(names, 'preview'));
    expect(() => checkProductionEnvironment(['sentry-metadata', '/linked'], {})).toThrow(/scope/);
  });
  it('never includes CLI failure payloads in its error', () => {
    exec.mockImplementation(() => {
      throw new Error('synthetic-private-canary');
    });
    expect(() => checkProductionEnvironment(['sentry-metadata', '/linked'], {})).toThrow(
      /^Unable to retrieve production environment metadata$/,
    );
    expect(exec).toHaveBeenCalledTimes(1);
  });
});
