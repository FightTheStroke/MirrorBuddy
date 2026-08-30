import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

describe('API requests are not sabotaged before they leave the app', () => {
  it('never pins a single static origin on API responses', async () => {
    const nextConfig = await import('../../next.config');
    const rules = (await nextConfig.default.headers?.()) as HeaderRule[] | undefined;
    const apiRule = rules?.find((rule) => rule.source === '/api/:path*');

    const staticOrigin = apiRule?.headers.find(
      (header) => header.key === 'Access-Control-Allow-Origin',
    );

    // A static value cannot serve both the apex and the www host, and it
    // overrides the per-request whitelist in src/lib/security/cors-config.ts.
    expect(staticOrigin).toBeUndefined();
  });

  it('lets the service worker leave API calls to the browser', () => {
    const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    const serviceWorker = readFileSync(join(appRoot, 'public', 'sw.js'), 'utf-8');
    const apiBranch = serviceWorker.slice(
      serviceWorker.indexOf('url.pathname.startsWith("/api/")'),
    );
    const branchBody = apiBranch.slice(0, apiBranch.indexOf('}') + 1);

    // Re-issuing the request inside the worker costs a round trip and loses
    // request semantics that WebKit enforces (credentials, redirect, CORS).
    expect(branchBody).not.toContain('respondWith');
  });
});
