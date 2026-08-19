#!/usr/bin/env node
/**
 * Copies the pdf.js worker from node_modules into apps/web/public so it is
 * served from our own origin.
 *
 * Why self-hosted: the CSP in src/proxy.ts sets `worker-src 'self' blob:` and
 * does not allow any CDN in `script-src`, so a remote worker is always blocked.
 * pdfjs-dist also ships ESM only, so the historical `pdf.worker.min.js` path
 * does not exist in v5+.
 *
 * Run after bumping pdfjs-dist; `pdf-worker.test.ts` fails if it is forgotten.
 */
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const pkg = require('pdfjs-dist/package.json');
const source = join(
  dirname(require.resolve('pdfjs-dist/package.json')),
  'build',
  'pdf.worker.min.mjs'
);
const targetDir = join(repoRoot, 'apps', 'web', 'public', 'pdf');
const target = join(targetDir, 'pdf.worker.min.mjs');

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);

if (!readFileSync(target, 'utf8').includes(pkg.version)) {
  throw new Error(
    `Copied worker does not advertise version ${pkg.version}; refusing to ship it.`
  );
}

process.stdout.write(`pdf.js worker ${pkg.version} -> public/pdf/pdf.worker.min.mjs\n`);
