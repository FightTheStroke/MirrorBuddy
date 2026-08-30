/**
 * TDD: password recovery pages must stay reachable while logged out.
 *
 * /forgot-password and /reset-password were missing from AUTH_PUBLIC_ROUTES,
 * so the proxy redirected anonymous visitors to /welcome — and anyone who
 * needs to reset a password is, by definition, anonymous. The whole recovery
 * flow was unreachable in production even though both routes worked.
 *
 * Tests verify proxy behavior using NextRequest mocks.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-intl/middleware', () => {
  const { NextResponse } = require('next/server'); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    default: () => {
      return () => NextResponse.next();
    },
  };
});

vi.mock('@/lib/i18n/locale-detection', () => ({
  detectLocaleFromRequest: () => 'it',
  extractLocaleFromUrl: (pathname: string) => {
    const match = pathname.match(/^\/(it|en|fr|de|es)(\/|$)/);
    return match ? match[1] : null;
  },
}));

vi.mock('@/lib/observability/metrics-store', () => ({
  metricsStore: {
    recordLatency: vi.fn(),
    recordError: vi.fn(),
  },
}));

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/security', () => ({
  generateNonce: () => 'test-nonce-123',
  CSP_NONCE_HEADER: 'x-csp-nonce',
}));

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe('proxy.ts - password recovery routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const recoveryPaths = [
    '/it/forgot-password',
    '/en/forgot-password',
    '/it/reset-password',
    '/en/reset-password',
  ];

  for (const path of recoveryPaths) {
    it(`does NOT redirect anonymous users away from ${path}`, async () => {
      const { default: proxy } = await import('@/proxy');
      const response = proxy(makeRequest(`http://localhost:3000${path}`));

      const location = response.headers.get('location') ?? '';
      expect(location).not.toMatch(/\/welcome/);
      expect(location).not.toMatch(/\/login/);
      expect([200, 307, 308]).toContain(response.status);
    });
  }
});
