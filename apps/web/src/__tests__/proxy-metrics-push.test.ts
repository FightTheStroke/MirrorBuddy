/**
 * Regression for #1158: the per-instance Grafana push must be tied to a
 * response and kept alive by the request's waitUntil, never a boot timer.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, type NextFetchEvent } from 'next/server';

vi.mock('next-intl/middleware', () => {
  const { NextResponse } = require('next/server'); // eslint-disable-line @typescript-eslint/no-require-imports
  return { default: () => () => NextResponse.next() };
});
vi.mock('@/lib/i18n/locale-detection', () => ({
  detectLocaleFromRequest: () => 'it',
  extractLocaleFromUrl: () => null,
}));
vi.mock('@/lib/observability/metrics-store', () => ({
  metricsStore: { recordLatency: vi.fn(), recordError: vi.fn() },
}));
vi.mock('@/lib/observability/push-after-response', () => ({
  schedulePushAfterResponse: vi.fn(),
}));
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});
vi.mock('@/lib/security', () => ({
  generateNonce: () => 'test-nonce-123',
  CSP_NONCE_HEADER: 'x-csp-nonce',
}));

import proxy from '../proxy';
import { schedulePushAfterResponse } from '@/lib/observability/push-after-response';

describe('proxy metrics push lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hands the push for an API response to the request waitUntil', () => {
    const event = { waitUntil: vi.fn() } as unknown as NextFetchEvent;

    proxy(new NextRequest('https://www.mirrorbuddy.org/api/user'), event);

    expect(schedulePushAfterResponse).toHaveBeenCalledTimes(1);
    const keepAlive = vi.mocked(schedulePushAfterResponse).mock.calls[0][0];
    const pending = Promise.resolve();
    keepAlive?.(pending);
    expect(event.waitUntil).toHaveBeenCalledWith(pending);
  });

  it('does not schedule a push for static assets', () => {
    proxy(new NextRequest('https://www.mirrorbuddy.org/logo.png'), {
      waitUntil: vi.fn(),
    } as unknown as NextFetchEvent);

    expect(schedulePushAfterResponse).not.toHaveBeenCalled();
  });
});
