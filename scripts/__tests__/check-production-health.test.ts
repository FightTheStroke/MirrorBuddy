/**
 * @vitest-environment node
 *
 * The post-promotion check must be able to fail.
 *
 * Its previous form lived in the workflow YAML, probed the Vercel alias rather
 * than the domain users open, and on a bad answer emitted `::warning::` and let
 * the job finish green. Two of these tests would have been impossible to write
 * then — the decision was not a thing you could call.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  PRODUCTION_URLS,
  checkProductionHealth,
  formatVerdict,
} from '../ci/check-production-health';

const noSleep = async () => {};
const ok = () => ({ status: 200 }) as Response;

describe('production health check', () => {
  it('probes the canonical domain, not only the Vercel alias', () => {
    expect(PRODUCTION_URLS).toContain('https://www.mirrorbuddy.org');
  });

  it('is healthy when every URL answers 200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok());

    const verdict = await checkProductionHealth({ fetchImpl: fetchImpl as never, sleep: noSleep });

    expect(verdict.healthy).toBe(true);
    expect(verdict.failures).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(PRODUCTION_URLS.length);
  });

  it('fails when the canonical domain is broken even though the alias is fine', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.startsWith('https://www.mirrorbuddy.org')
        ? ({ status: 503 } as Response)
        : ({ status: 200 } as Response),
    );

    const verdict = await checkProductionHealth({
      fetchImpl: fetchImpl as never,
      sleep: noSleep,
      attempts: 2,
    });

    expect(verdict.healthy).toBe(false);
    expect(verdict.failures).toHaveLength(1);
    expect(verdict.failures[0]).toContain('https://www.mirrorbuddy.org');
    expect(verdict.failures[0]).toContain('503');
  });

  it('retries a cold start instead of failing on the first answer', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return { status: calls < 3 ? 503 : 200 } as Response;
    });

    const verdict = await checkProductionHealth({
      urls: ['https://example.test'],
      fetchImpl: fetchImpl as never,
      sleep: noSleep,
      attempts: 5,
    });

    expect(verdict.healthy).toBe(true);
    expect(verdict.results[0].attempts).toBe(3);
  });

  it('gives up after the configured attempts rather than retrying forever', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 500 } as Response);

    const verdict = await checkProductionHealth({
      urls: ['https://example.test'],
      fetchImpl: fetchImpl as never,
      sleep: noSleep,
      attempts: 4,
    });

    expect(verdict.healthy).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('treats an unreachable host as a failure, not as an unknown', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    const verdict = await checkProductionHealth({
      urls: ['https://example.test'],
      fetchImpl: fetchImpl as never,
      sleep: noSleep,
      attempts: 2,
    });

    expect(verdict.healthy).toBe(false);
    expect(verdict.failures[0]).toContain('unreachable');
    expect(verdict.failures[0]).toContain('ENOTFOUND');
  });

  it('waits between attempts', async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn().mockResolvedValue({ status: 500 } as Response);

    await checkProductionHealth({
      urls: ['https://example.test'],
      fetchImpl: fetchImpl as never,
      sleep,
      attempts: 3,
      delayMs: 1234,
    });

    // Two waits for three attempts: nothing is gained by sleeping after the last.
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1234);
  });

  it('says "roll back" out loud, at error level', () => {
    const output = formatVerdict({
      healthy: false,
      results: [{ url: 'https://www.mirrorbuddy.org', status: 503, attempts: 5 }],
      failures: ['https://www.mirrorbuddy.org/api/health returned HTTP 503 after 5 attempts'],
    });

    expect(output).toContain('::error::');
    expect(output).toContain('Roll back');
    expect(output).not.toContain('::warning::');
  });

  it('does not annotate a healthy run with an error', () => {
    const output = formatVerdict({
      healthy: true,
      results: [{ url: 'https://www.mirrorbuddy.org', status: 200, attempts: 1 }],
      failures: [],
    });

    expect(output).not.toContain('::error::');
  });
});

describe('the workflow uses this script and does not warn-and-continue', () => {
  it('promote-to-production.yml calls the script and no longer downgrades a bad health check', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const workflow = readFileSync(
      join(process.cwd(), '.github/workflows/promote-to-production.yml'),
      'utf8',
    );

    expect(workflow).toContain('scripts/ci/check-production-health.ts');
    expect(workflow).not.toContain('::warning::Production health check');
  });
});
