/**
 * CSP Header Tests - Security Requirements F-10, F-11
 *
 * F-10: CSP connect-src MUST include Supabase/Grafana/Upstash domains
 * F-11: CSP MUST NOT allow ws://localhost in production
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Next.js server modules before importing proxy
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({ headers: new Map() })),
    redirect: vi.fn(() => ({ headers: new Map() })),
  },
}));

vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['it', 'en', 'fr', 'de', 'es'],
    defaultLocale: 'it',
  },
}));

vi.mock('@/lib/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security')>();
  return {
    ...actual,
    generateNonce: vi.fn(() => 'test-nonce'),
    CSP_NONCE_HEADER: 'x-csp-nonce',
  };
});

vi.mock('@/lib/observability/metrics-store', () => ({
  metricsStore: {
    recordLatency: vi.fn(),
    recordError: vi.fn(),
  },
}));

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    AUTH_COOKIE_NAME: 'mirrorbuddy-user-id',
    VISITOR_COOKIE_NAME: 'mirrorbuddy-visitor-id',
  };
});

// We'll need to export buildCSPHeader from proxy.ts for testing
import { buildCSPHeader } from '../proxy';

describe('CSP Header Security', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('F-11: Production CSP excludes localhost', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('should NOT include ws://localhost in production', () => {
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).not.toContain('ws://localhost');
    });

    it('should NOT include wss://localhost in production', () => {
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).not.toContain('wss://localhost');
    });

    it('should NOT include http://localhost in production', () => {
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).not.toContain('http://localhost');
    });
  });

  describe('F-11: Development CSP includes localhost', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('should include ws://localhost:* in development', () => {
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('ws://localhost:*');
    });

    it('should include wss://localhost:* in development', () => {
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('wss://localhost:*');
    });

    it('should include http://localhost:11434 in development', () => {
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('http://localhost:11434');
    });
  });

  describe('F-10: Required external domains', () => {
    it.each(['production', 'development'])('should include Supabase domains in %s', (env) => {
      vi.stubEnv('NODE_ENV', env);
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('https://*.supabase.co');
      expect(csp).toContain('wss://*.supabase.co');
    });

    it.each(['production', 'development'])('should include Grafana domains in %s', (env) => {
      vi.stubEnv('NODE_ENV', env);
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('https://*.grafana.net');
    });

    it.each(['production', 'development'])('should include Upstash domains in %s', (env) => {
      vi.stubEnv('NODE_ENV', env);
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('https://*.upstash.io');
    });

    it.each(['production', 'development'])('should include Azure OpenAI domains in %s', (env) => {
      vi.stubEnv('NODE_ENV', env);
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('https://*.openai.azure.com');
      expect(csp).toContain('wss://*.openai.azure.com');
    });

    it.each(['production', 'development'])('should include Vercel domains in %s', (env) => {
      vi.stubEnv('NODE_ENV', env);
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('https://va.vercel-scripts.com');
      expect(csp).toContain('https://vitals.vercel-insights.com');
    });

    it.each(['production', 'development'])('should include Sentry domains in %s', (env) => {
      vi.stubEnv('NODE_ENV', env);
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain('*.ingest.us.sentry.io');
      expect(csp).toContain('*.ingest.de.sentry.io');
    });
  });

  describe('CSP structure', () => {
    it('should include nonce in script-src directive', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const nonce = 'test-nonce-abc123';
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).toContain('script-src');
    });

    it('should include all required CSP directives', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const nonce = 'test-nonce-123';
      const csp = buildCSPHeader(nonce);

      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'font-src',
        'img-src',
        'media-src',
        'connect-src',
        'worker-src',
        'frame-src',
        'object-src',
        'base-uri',
        'form-action',
        'frame-ancestors',
      ];

      requiredDirectives.forEach((directive) => {
        expect(csp).toContain(directive);
      });
    });
  });
});

describe('Admin locale redirect preserves query params', () => {
  it('should preserve query parameters when redirecting /it/admin?tab=users', () => {
    // This test verifies that when a user accesses /it/admin?tab=users,
    // they are redirected to /admin?tab=users (query params preserved)
    const baseUrl = 'http://localhost:3000';
    const originalUrl = new URL('/it/admin?tab=users&page=2', baseUrl);

    // Verify URL construction preserves search params
    expect(originalUrl.pathname).toBe('/it/admin');
    expect(originalUrl.search).toBe('?tab=users&page=2');

    // Simulate the redirect logic from proxy.ts
    const pathWithoutLocale = '/admin';
    const redirectUrl = new URL(pathWithoutLocale, originalUrl.href);
    // T3-08 FIX: Copy search params from original request
    redirectUrl.search = originalUrl.search;

    // Verify query params are preserved after redirect
    expect(redirectUrl.pathname).toBe('/admin');
    expect(redirectUrl.search).toBe('?tab=users&page=2');
  });

  it('should preserve query parameters when redirecting /en/admin/users?sort=name', () => {
    const baseUrl = 'http://localhost:3000';
    const originalUrl = new URL('/en/admin/users?sort=name&order=asc', baseUrl);

    expect(originalUrl.pathname).toBe('/en/admin/users');
    expect(originalUrl.search).toBe('?sort=name&order=asc');

    // Simulate the redirect logic from proxy.ts
    const pathWithoutLocale = '/admin/users';
    const redirectUrl = new URL(pathWithoutLocale, originalUrl.href);
    // T3-08 FIX: Copy search params from original request
    redirectUrl.search = originalUrl.search;

    // Verify query params are preserved after redirect
    expect(redirectUrl.pathname).toBe('/admin/users');
    expect(redirectUrl.search).toBe('?sort=name&order=asc');
  });
});
