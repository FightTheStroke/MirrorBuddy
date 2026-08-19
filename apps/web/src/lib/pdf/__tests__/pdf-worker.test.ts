/**
 * Guards the self-hosted pdf.js worker.
 *
 * Three real production bugs motivated these tests:
 *  1. `workerSrc` pointed at `pdf.worker.min.js`, which pdfjs-dist stopped
 *     shipping in v5 (ESM only) - the CDN returned 404.
 *  2. Even with the right filename, the CSP in `src/proxy.ts` allows no CDN in
 *     `script-src` and sets `worker-src 'self' blob:`, so a remote worker is
 *     blocked outright.
 *  3. A bumped pdfjs-dist with a stale copy in `public/` would silently ship a
 *     mismatched worker, which pdf.js rejects at runtime.
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { PDF_WORKER_SRC } from '../pdf-worker';

// Read the version from the manifest: importing pdfjs-dist itself needs browser
// globals (DOMMatrix) that a Node test environment does not provide.
const pdfjsVersion: string = createRequire(import.meta.url)(
  'pdfjs-dist/package.json'
).version;

// Resolved from this file, not process.cwd(), because vitest runs from the
// repository root while the asset lives under apps/web/public.
const WORKER_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'public',
  'pdf',
  'pdf.worker.min.mjs',
);

describe('pdf.js worker', () => {
  it('is served from our own origin, as the CSP requires', () => {
    expect(PDF_WORKER_SRC.startsWith('/')).toBe(true);
    // A protocol-relative '//host/...' is cross-origin too, and is exactly
    // the form that shipped broken.
    expect(PDF_WORKER_SRC.startsWith('//')).toBe(false);
    expect(PDF_WORKER_SRC).not.toContain('://');
  });

  it('is an ES module, which is all pdfjs-dist ships from v5', () => {
    expect(PDF_WORKER_SRC.endsWith('.mjs')).toBe(true);
  });

  it('exists at the path the browser will request', () => {
    expect(statSync(WORKER_FILE).size).toBeGreaterThan(100_000);
  });

  it('matches the installed pdfjs-dist version', () => {
    const worker = readFileSync(WORKER_FILE, 'utf8');
    expect(worker).toContain(pdfjsVersion);
  });
});
