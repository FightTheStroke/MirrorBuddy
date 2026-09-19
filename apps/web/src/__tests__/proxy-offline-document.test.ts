// @vitest-environment node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CSP_NONCE_HEADER } from '@/lib/security';
import proxy, { shouldSkipI18n } from '../proxy';

const origin = 'http://localhost:3000';
const publicDirectory = path.join(process.cwd(), 'apps/web/public');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy offline precache document', () => {
  it('passes the exact worker GET through to its existing public file', () => {
    const worker = readFileSync(path.join(publicDirectory, 'sw.js'), 'utf8');
    expect(worker).toContain('const PRECACHE_ASSETS = ["/offline.html"]');

    const response = proxy(new NextRequest(`${origin}/offline.html`));
    const destination = new URL(response.headers.get('location') ?? '/offline.html', origin);

    expect(existsSync(path.join(publicDirectory, destination.pathname))).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('location')).toBeNull();
    expect(shouldSkipI18n('/offline.html')).toBe(true);
  });

  it.each(['GET', 'HEAD'])(
    'keeps the exact public pathname with query parameters for %s',
    (method) => {
      const response = proxy(
        new NextRequest(`${origin}/offline.html?version=1`, {
          method,
          headers: { 'accept-language': 'fr', 'x-request-id': 'offline-precache-test' },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('x-middleware-rewrite')).toBeNull();
      expect(response.headers.get('x-request-id')).toBe('offline-precache-test');
      expect(response.headers.get(`x-middleware-request-${CSP_NONCE_HEADER}`)).toBeTruthy();
    },
  );

  it('keeps the offline resource available during maintenance without a provider or session', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true');
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', '');
    vi.stubEnv('AZURE_OPENAI_API_KEY', '');
    vi.stubEnv('OLLAMA_URL', '');
    vi.stubEnv('NEXT_PUBLIC_OLLAMA_ENABLED', 'false');

    expect(proxy(new NextRequest(`${origin}/offline.html`)).headers.get('x-middleware-next')).toBe(
      '1',
    );
    const page = proxy(new NextRequest(`${origin}/it/astuccio`));
    expect(new URL(page.headers.get('location')!).pathname).toBe('/it/maintenance');
  });

  it.each([
    '/offline.html/child',
    '/offline.html-extra',
    '/offline.html.backup',
    '/OFFLINE.html',
    '/other.html',
    '/nested/offline.html',
    '/it/offline.html',
  ])('does not classify the lookalike %s as the public offline resource', (pathname) => {
    expect(shouldSkipI18n(pathname)).toBe(false);
    const response = proxy(
      new NextRequest(`${origin}${pathname}`, { headers: { 'accept-language': 'it' } }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('x-middleware-next')).toBeNull();
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      pathname.startsWith('/it/') ? '/it/welcome' : `/it${pathname}`,
    );
  });

  it('preserves locale routing for actual application pages', () => {
    const response = proxy(
      new NextRequest(`${origin}/astuccio?view=recent`, {
        headers: { 'accept-language': 'fr' },
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${origin}/fr/astuccio?view=recent`);
  });

  it.each([
    ['/it/astuccio', '/it/welcome'],
    ['/it/parent-dashboard', '/it/login'],
    ['/admin', '/login'],
  ])('preserves anonymous route protection for %s', (pathname, destination) => {
    const response = proxy(new NextRequest(`${origin}${pathname}`));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe(destination);
  });

  it('preserves production page CSP, forwarded nonce and explicit locale', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = proxy(new NextRequest(`${origin}/en/welcome`));
    const nonce = response.headers.get(CSP_NONCE_HEADER);
    expect(response.status).toBe(200);
    expect(nonce).toBeTruthy();
    expect(response.headers.get(`x-middleware-request-${CSP_NONCE_HEADER}`)).toBe(nonce);
    expect(response.headers.get('content-security-policy')).toContain(`'nonce-${nonce}'`);
    expect(response.headers.get('content-security-policy')).not.toContain("'unsafe-eval'");
    expect(response.headers.get('x-next-intl-locale')).toBe('en');
    expect(response.cookies.get('NEXT_LOCALE')?.value).toBe('en');
  });
});
