import { beforeEach, describe, expect, it, vi } from 'vitest';

const { nextSpy, redirectSpy } = vi.hoisted(() => ({
  nextSpy: vi.fn(),
  redirectSpy: vi.fn(),
}));

function createMockResponse(status: number) {
  return {
    status,
    headers: new Headers(),
    cookies: {
      set: vi.fn(),
    },
  };
}

vi.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    next: nextSpy.mockImplementation(() => createMockResponse(200)),
    redirect: redirectSpy.mockImplementation((url: URL | string) => {
      const response = createMockResponse(307) as ReturnType<typeof createMockResponse> & {
        redirectedTo: string;
      };
      response.redirectedTo = url.toString();
      return response;
    }),
  },
}));

vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => vi.fn(() => createMockResponse(307))),
}));

vi.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['it', 'en', 'fr', 'de', 'es'],
    defaultLocale: 'it',
  },
}));

vi.mock('@/lib/security', () => ({
  generateNonce: vi.fn(() => 'test-nonce'),
  CSP_NONCE_HEADER: 'x-csp-nonce',
}));

vi.mock('@/lib/observability/metrics-store', () => ({
  metricsStore: {
    recordLatency: vi.fn(),
    recordError: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  AUTH_COOKIE_NAME: 'mirrorbuddy-user-id',
  VISITOR_COOKIE_NAME: 'mirrorbuddy-visitor-id',
}));

import proxy from '@/proxy';

type MockRequest = {
  url: string;
  nextUrl: { pathname: string; clone: () => URL };
  headers: Headers;
  cookies: {
    get: (name: string) => { value: string } | undefined;
  };
};

function createRequest(pathname: string, cookies: Record<string, string> = {}): MockRequest {
  const url = `https://example.com${pathname}`;
  return {
    url,
    nextUrl: {
      pathname,
      clone: () => new URL(url),
    },
    headers: new Headers(),
    cookies: {
      get: (name: string) => {
        const value = cookies[name];
        return value ? { value } : undefined;
      },
    },
  };
}

describe('proxy maintenance redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MAINTENANCE_MODE', 'true');
  });

  it('redirects user pages to locale maintenance when MAINTENANCE_MODE=true', () => {
    const request = createRequest('/it/dashboard');

    const response = proxy(request as never) as { redirectedTo?: string };

    expect(response.redirectedTo).toBe('https://example.com/it/maintenance');
  });

  it('passes through /admin/* during maintenance', () => {
    const request = createRequest('/admin/users', {
      'mirrorbuddy-user-id': 'test-user',
    });

    proxy(request as never);

    expect(nextSpy).toHaveBeenCalled();
  });

  it('passes through /api/* during maintenance', () => {
    const request = createRequest('/api/cron/cleanup');

    proxy(request as never);

    expect(nextSpy).toHaveBeenCalled();
  });

  it('should NOT redirect /api/cron/* paths during maintenance', () => {
    const request = createRequest('/api/cron/maintenance-notify');

    const response = proxy(request as never) as { redirectedTo?: string; status: number };

    expect(redirectSpy).not.toHaveBeenCalled();
    expect(nextSpy).toHaveBeenCalled();
    expect(response.redirectedTo).toBeUndefined();
    expect(response.status).toBe(200);
  });

  it('passes through /maintenance to avoid redirect loops', () => {
    const request = createRequest('/it/maintenance');

    proxy(request as never);

    expect(nextSpy).toHaveBeenCalled();
  });
});
