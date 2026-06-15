/**
 * TDD: proxy.ts waitlist routing
 *
 * The coming-soon page and its proxy gating were retired during the
 * intention-based UX simplification. The waitlist email-link landing pages
 * (verify/unsubscribe) remain public and must stay accessible without auth.
 *
 * Tests verify proxy behavior using NextRequest mocks.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { _resetForTesting } from '@/lib/feature-flags/feature-flags-service';

// Mock next-intl createIntlMiddleware to avoid locale routing side effects
vi.mock('next-intl/middleware', () => {
  const { NextResponse } = require('next/server'); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    default: () => {
      return () => NextResponse.next();
    },
  };
});

// Mock locale detection helpers
vi.mock('@/lib/i18n/locale-detection', () => ({
  detectLocaleFromRequest: () => 'it',
  extractLocaleFromUrl: (pathname: string) => {
    const match = pathname.match(/^\/(it|en|fr|de|es)(\/|$)/);
    return match ? match[1] : null;
  },
}));

// Mock metricsStore
vi.mock('@/lib/observability/metrics-store', () => ({
  metricsStore: {
    recordLatency: vi.fn(),
    recordError: vi.fn(),
  },
}));

// Mock Prisma to prevent DB calls from feature-flags updateFlag
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

// Mock generateNonce
vi.mock('@/lib/security', () => ({
  generateNonce: () => 'test-nonce-123',
  CSP_NONCE_HEADER: 'x-csp-nonce',
}));

function makeRequest(url: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

describe('proxy.ts - waitlist routing', () => {
  beforeEach(() => {
    _resetForTesting();
    vi.clearAllMocks();
  });

  // =========================================================================
  // /waitlist must remain in AUTH_PUBLIC_ROUTES (email-link landing pages)
  // =========================================================================
  describe('AUTH_PUBLIC_ROUTES includes waitlist', () => {
    it('allows unauthenticated access to /it/waitlist', async () => {
      const { default: proxy } = await import('@/proxy');
      const req = makeRequest('http://localhost:3000/it/waitlist');
      const response = proxy(req);
      if (response.status === 307 || response.status === 302) {
        const location = response.headers.get('location') ?? '';
        expect(location).not.toContain('/welcome');
        expect(location).not.toContain('/login');
      }
      expect([200, 307, 308]).toContain(response.status);
    });

    it('does NOT redirect /waitlist to /welcome for anonymous users', async () => {
      const { default: proxy } = await import('@/proxy');
      const req = makeRequest('http://localhost:3000/it/waitlist');
      const response = proxy(req);
      const location = response.headers.get('location') ?? '';
      expect(location).not.toMatch(/\/welcome/);
    });
  });

  // =========================================================================
  // The coming-soon page and its gating were retired: anonymous users must
  // never be redirected to /coming-soon regardless of the (now dead) flag.
  // =========================================================================
  describe('coming-soon gating is retired', () => {
    it('does NOT redirect anonymous users to /coming-soon on protected pages', async () => {
      const { default: proxy } = await import('@/proxy');
      const req = makeRequest('http://localhost:3000/it/chat');
      const response = proxy(req);

      const location = response.headers.get('location') ?? '';
      expect(location).not.toContain('/coming-soon');
    });
  });
});
