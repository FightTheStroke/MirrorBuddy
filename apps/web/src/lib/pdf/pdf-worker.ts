/**
 * Location of the self-hosted pdf.js worker.
 *
 * Kept in its own module, free of any pdfjs-dist import, so it can be asserted
 * on without pulling the browser-only library into a Node test environment.
 *
 * It must stay same-origin: the CSP in `src/proxy.ts` sets
 * `worker-src 'self' blob:` and allows no CDN in `script-src`, so a remote
 * worker is blocked before it can load. pdfjs-dist is also ESM-only from v5,
 * so the historical `pdf.worker.min.js` filename no longer exists.
 *
 * The file is copied from node_modules by `scripts/sync-pdf-worker.mjs`; run it
 * after every pdfjs-dist bump. `__tests__/pdf-worker.test.ts` fails otherwise.
 */
export const PDF_WORKER_SRC = '/pdf/pdf.worker.min.mjs';
