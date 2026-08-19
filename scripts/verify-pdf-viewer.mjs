#!/usr/bin/env node
/**
 * Proves the PDF viewer actually renders.
 *
 * jsdom has no canvas and no module workers, so unit tests cannot cover this.
 * This harness runs the shipped artefacts in real Chromium:
 *   - the worker file from apps/web/public, byte for byte as deployed;
 *   - the same Content-Security-Policy the app sends from src/proxy.ts;
 *   - a real PDF, rendered to a canvas, with the pixels inspected afterwards.
 *
 * It caught three production bugs: a 404 worker filename, a worker origin the
 * CSP forbids, and thumbnails squashed to the canvas default height.
 *
 * Usage: node scripts/verify-pdf-viewer.mjs
 */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = join(repoRoot, 'apps', 'web');

const { chromium } = require('playwright');

const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
const pdfjsVersion = require('pdfjs-dist/package.json').version;

// The worker path the application uses, read from the source of truth so this
// harness cannot drift away from what the app requests.
const workerSrc = readFileSync(
  join(webRoot, 'src', 'lib', 'pdf', 'pdf-worker.ts'),
  'utf8'
).match(/PDF_WORKER_SRC = '([^']+)'/)?.[1];

if (!workerSrc) {
  throw new Error('Could not read PDF_WORKER_SRC from src/lib/pdf/pdf-worker.ts');
}

/** A one-page PDF that paints a large black rectangle we can detect. */
function buildFixturePdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
    null, // stream, built below
  ];
  const stream = '0 0 0 rg 20 20 160 160 re f';
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const fixturePdf = buildFixturePdf();

const HARNESS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>pdf viewer harness</title></head>
<body><script type="module" src="/harness.mjs"></script></body></html>`;

const HARNESS_SCRIPT = `
import * as pdfjsLib from '/vendor/pdf.min.mjs';

window.__result = (async () => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = ${JSON.stringify(workerSrc)};

  const bytes = await (await fetch('/fixture.pdf')).arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const canvasContext = canvas.getContext('2d');
  await page.render({ canvasContext, viewport, canvas }).promise;

  const { data } = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
  let inked = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 128 && data[i + 1] < 128 && data[i + 2] < 128) inked++;
  }

  return {
    version: pdfjsLib.version,
    numPages: pdf.numPages,
    width: canvas.width,
    height: canvas.height,
    inkedPixels: inked,
    dataUrlPrefix: canvas.toDataURL('image/jpeg', 0.9).slice(0, 23),
  };
})();
`;

// A protocol-relative '//host/...' also starts with a slash, so reject it
// explicitly - that is the exact form that shipped broken.
const isSameOrigin =
  workerSrc.startsWith('/') &&
  !workerSrc.startsWith('//') &&
  !workerSrc.includes('://');

const ROUTES = {
  '/': [HARNESS_HTML, 'text/html; charset=utf-8'],
  '/harness.mjs': [HARNESS_SCRIPT, 'text/javascript; charset=utf-8'],
  '/vendor/pdf.min.mjs': [
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- dev-only harness; path is derived from a resolved node_modules root, never from input
    readFileSync(join(pdfjsRoot, 'build', 'pdf.min.mjs')),
    'text/javascript; charset=utf-8',
  ],
  '/fixture.pdf': [fixturePdf, 'application/pdf'],
};

// A cross-origin worker is served by nobody here, exactly as in production
// where the CSP refuses it. Leaving the route out reproduces that failure.
if (isSameOrigin) {
  ROUTES[workerSrc] = [
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- dev-only harness; workerSrc is a same-origin literal asserted above
    readFileSync(join(webRoot, 'public', workerSrc.replace(/^\//, ''))),
    'text/javascript; charset=utf-8',
  ];
}

// Mirrors the directives from src/proxy.ts that decide whether the worker loads.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "img-src 'self' data: blob:",
].join('; ');

const server = createServer((req, res) => {
  const route = ROUTES[new URL(req.url, 'http://localhost').pathname];
  if (!route) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': route[1],
    'Content-Security-Policy': CSP,
  });
  res.end(route[0]);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// PW_CHANNEL lets a machine without the bundled headless shell use an
// installed Chromium build (for example 'msedge' or 'chrome').
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage();

const violations = [];
page.on('console', (msg) => {
  if (/Content Security Policy|Refused to/i.test(msg.text())) {
    violations.push(msg.text());
  }
});
page.on('pageerror', (err) => violations.push(`pageerror: ${err.message}`));

let failure = null;
try {
  await page.goto(origin, { waitUntil: 'load' });
  const result = await page
    .evaluate(() => window.__result)
    .catch((error) => {
      violations.push(`render failed: ${error.message}`);
      return {};
    });

  const checks = [
    ['worker path is same-origin', isSameOrigin],
    ['no CSP violation or page error', violations.length === 0],
    ['pdfjs version matches package', result.version === pdfjsVersion],
    ['document reports 1 page', result.numPages === 1],
    ['viewport scaled to 400x400', result.width === 400 && result.height === 400],
    ['page rendered real ink', result.inkedPixels > 50_000],
    [
      'canvas exports a JPEG data URL',
      Boolean(result.dataUrlPrefix?.startsWith('data:image/jpeg')),
    ],
  ];

  for (const [label, ok] of checks) {
    process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${label}\n`);
  }
  if (result.version) {
    process.stdout.write(
      `\npdf.js ${result.version} rendered ${result.inkedPixels} inked pixels ` +
        `on a ${result.width}x${result.height} canvas\n`
    );
  }
  if (violations.length > 0) {
    process.stdout.write(`\nviolations:\n${violations.join('\n')}\n`);
  }
  if (checks.some(([, ok]) => !ok)) {
    failure = new Error('PDF viewer verification failed');
  }
} catch (error) {
  failure = error;
} finally {
  await browser.close();
  server.close();
}

if (failure) {
  process.stderr.write(`${failure.stack || failure.message}\n`);
  process.exit(1);
}
