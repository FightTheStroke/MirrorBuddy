/**
 * Guards the paths that must never be treated as localisable pages.
 *
 * A real production bug: `/pdf/pdf.worker.min.mjs` was 307-redirected to
 * `/it/welcome`, because `.mjs` was missing from the static extension list.
 * The browser asked for a worker script and got an HTML page, so the PDF
 * viewer failed for every student in production while every local check —
 * unit tests, build, and even a real-browser render — stayed green, since
 * none of them go through the proxy.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({ headers: new Map() })),
    redirect: vi.fn(() => ({ headers: new Map() })),
  },
}));

vi.mock('next-intl/middleware', () => ({ default: vi.fn(() => vi.fn()) }));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['it', 'en', 'fr', 'de', 'es'], defaultLocale: 'it' },
}));

vi.mock('@/lib/observability/metrics-store', () => ({
  metricsStore: { recordLatency: vi.fn(), recordError: vi.fn() },
}));

import { shouldSkipI18n } from '../proxy';
import { PDF_WORKER_SRC } from '@/lib/pdf/pdf-worker';

describe('proxy static asset handling', () => {
  it('does not localise the self-hosted pdf.js worker', () => {
    // Uses the real constant, so moving the worker cannot silently
    // reintroduce the bug.
    expect(shouldSkipI18n(PDF_WORKER_SRC)).toBe(true);
  });

  it.each([
    '/pdf/pdf.worker.min.mjs',
    '/some/module.mjs',
    '/wasm/decoder.wasm',
    '/build/app.js.map',
  ])('treats %s as a static asset', (path) => {
    expect(shouldSkipI18n(path)).toBe(true);
  });

  it.each(['/welcome', '/astuccio', '/', '/study-kit/new'])(
    'still localises the page %s',
    (path) => {
      expect(shouldSkipI18n(path)).toBe(false);
    },
  );
});
