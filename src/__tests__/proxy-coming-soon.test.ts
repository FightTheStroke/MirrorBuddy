/**
 * TDD: proxy.ts coming-soon/waitlist routing
 *
 * Plan 157 / T2-01 + T2-02:
 * - T2-01: /coming-soon and /waitlist must be in AUTH_PUBLIC_ROUTES (accessible without auth)
 * - T2-02: coming_soon_overlay feature flag gates anonymous users to /coming-soon
 *
 * Tests verify proxy behavior using NextRequest mocks.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { _resetForTesting, updateFlag } from '@/lib/feature-flags/feature-flags-service';

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
vi.mock('@/lib/db', () => ({
  prisma: {
    featureFlag: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
    },
    globalConfig: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

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

describe('proxy.ts - coming-soon routing (T2-01 + T2-02)', () => {
  beforeEach(() => {
    _resetForTesting();
    vi.clearAllMocks();
  });

  // =========================================================================
  // T2-01: /coming-soon and /waitlist must be in AUTH_PUBLIC_ROUTES
  // =========================================================================
  describe('T2-01: AUTH_PUBLIC_ROUTES includes coming-soon and waitlist', () => {
    it('allows unauthenticated access to /it/coming-soon', async () => {
      const { default: proxy } = await import('@/proxy');
      const req = makeRequest('http://localhost:3000/it/coming-soon');
      const response = proxy(req);
      // Must NOT redirect to /welcome or /login
      if (response.status === 307 || response.status === 302) {
        const location = response.headers.get('location') ?? '';
        expect(location).not.toContain('/welcome');
        expect(location).not.toContain('/login');
      }
      // Acceptable outcomes: 200 (next()) or intl redirect to locale-prefixed route
      expect([200, 307, 308]).toContain(response.status);
    });

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

    it('does NOT redirect /coming-soon to /welcome for anonymous users', async () => {
      const { default: proxy } = await import('@/proxy');
      // Anonymous user (no cookies) accessing /it/coming-soon
      const req = makeRequest('http://localhost:3000/it/coming-soon');
      const response = proxy(req);
      const location = response.headers.get('location') ?? '';
      expect(location).not.toMatch(/\/welcome/);
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
  // T2-02: coming_soon_overlay gates anonymous users
  // =========================================================================
  describe('T2-02: coming_soon_overlay gating logic', () => {
    it('redirects anonymous users to /{locale}/coming-soon when flag is enabled', async () => {
      // Enable the coming_soon_overlay flag
      await updateFlag('coming_soon_overlay', { status: 'enabled' });

      const { default: proxy } = await import('@/proxy');
      // Anonymous user (no auth cookie, no visitor cookie) accessing a protected page
      const req = makeRequest('http://localhost:3000/it/chat');
      const response = proxy(req);

      // Must redirect to /it/coming-soon
      expect(response.status).toBe(307);
      const location = response.headers.get('location') ?? '';
      expect(location).toContain('/coming-soon');
    });

    it('does NOT redirect authenticated users when flag is enabled', async () => {
      await updateFlag('coming_soon_overlay', { status: 'enabled' });

      const { default: proxy } = await import('@/proxy');
      // Authenticated user with valid auth cookie
      const req = makeRequest('http://localhost:3000/it/chat', {
        'mirrorbuddy-user-id': 'valid-user-session',
      });
      const response = proxy(req);

      // Must NOT redirect to /coming-soon
      const location = response.headers.get('location') ?? '';
      expect(location).not.toContain('/coming-soon');
    });

    it('does NOT redirect when flag is disabled (default)', async () => {
      // coming_soon_overlay is disabled by default - no need to call updateFlag
      const { default: proxy } = await import('@/proxy');
      // Anonymous user accessing a protected page - should go to /welcome, NOT /coming-soon
      const req = makeRequest('http://localhost:3000/it/chat');
      const response = proxy(req);

      const location = response.headers.get('location') ?? '';
      expect(location).not.toContain('/coming-soon');
    });

    it('does NOT redirect public routes (AUTH_PUBLIC_ROUTES) when flag is enabled', async () => {
      await updateFlag('coming_soon_overlay', { status: 'enabled' });

      const { default: proxy } = await import('@/proxy');
      // Anonymous user accessing /welcome (always public)
      const req = makeRequest('http://localhost:3000/it/welcome');
      const response = proxy(req);

      const location = response.headers.get('location') ?? '';
      expect(location).not.toContain('/coming-soon');
    });

    it('does NOT redirect /coming-soon itself when flag is enabled (no infinite redirect)', async () => {
      await updateFlag('coming_soon_overlay', { status: 'enabled' });

      const { default: proxy } = await import('@/proxy');
      const req = makeRequest('http://localhost:3000/it/coming-soon');
      const response = proxy(req);

      const location = response.headers.get('location') ?? '';
      expect(location).not.toContain('/coming-soon');
    });
  });
});
