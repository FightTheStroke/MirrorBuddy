// @vitest-environment node
/**
 * Guard: the Next.js SERVER instrumentation hook must sit where Next actually
 * looks for it, and the CLIENT hook must keep its supported root location.
 *
 * Rule replicated from the installed Next 16.3.4 source, not invented here:
 *  - server: next/dist/build/index.js:696-732 computes `hasInstrumentationHook`
 *    by reading ONE directory, `join(pagesDir || appDir, '..')`, non-recursively.
 *    With appDir = apps/web/src/app that directory is apps/web/src.
 *    The flag is the only input to the two consumers that package the hook
 *    (index.js:1145-1147 manifest entry, utils.js:1103-1105 standalone copy).
 *  - client: next/dist/build/create-compiler-aliases.js:179-182 resolves an
 *    ORDERED candidate list, src/ first then the package root, so the client
 *    hook at the package root is supported and must not be moved.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PAGE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'mts'];
const APP_ROOT = path.resolve(__dirname, '../..');
const APP_DIR = path.join(APP_ROOT, 'src', 'app');

/** Replicates Next's non-recursive single-directory lookup for the server hook. */
function findServerInstrumentation(appDir: string): string | null {
  const searchDir = path.join(appDir, '..');
  let entries: string[];
  try {
    entries = fs.readdirSync(searchDir);
  } catch {
    return null;
  }
  const match = entries.find((entry) =>
    PAGE_EXTENSIONS.some((ext) => entry === `instrumentation.${ext}`),
  );
  return match ? path.join(searchDir, match) : null;
}

/** Replicates Next's ordered alias candidates for the client hook. */
function findClientInstrumentation(projectDir: string): string | null {
  const candidates = [
    path.join(projectDir, 'src', 'instrumentation-client'),
    path.join(projectDir, 'instrumentation-client'),
  ];
  for (const candidate of candidates) {
    for (const ext of PAGE_EXTENSIONS) {
      if (fs.existsSync(`${candidate}.${ext}`)) return `${candidate}.${ext}`;
    }
  }
  return null;
}

describe('instrumentation hook location', () => {
  it('finds the server hook only in the directory Next scans', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'instr-'));
    const appDir = path.join(base, 'src', 'app');
    fs.mkdirSync(appDir, { recursive: true });

    // Positive control: hook beside src/app is found.
    fs.writeFileSync(path.join(base, 'src', 'instrumentation.ts'), '');
    expect(findServerInstrumentation(appDir)).toBe(path.join(base, 'src', 'instrumentation.ts'));

    // Negative control: the same hook one level up is invisible to the scan.
    fs.rmSync(path.join(base, 'src', 'instrumentation.ts'));
    fs.writeFileSync(path.join(base, 'instrumentation.ts'), '');
    expect(findServerInstrumentation(appDir)).toBeNull();

    fs.rmSync(base, { recursive: true, force: true });
  });

  it('places this application server hook where Next scans for it', () => {
    expect(findServerInstrumentation(APP_DIR)).not.toBeNull();
  });

  it('keeps the client hook at a supported candidate path', () => {
    expect(findClientInstrumentation(APP_ROOT)).not.toBeNull();
  });

  it('accepts the package root for the client hook and rejects it for the server hook', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'instr-client-'));
    fs.mkdirSync(path.join(base, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(base, 'instrumentation-client.ts'), '');

    expect(findClientInstrumentation(base)).toBe(path.join(base, 'instrumentation-client.ts'));
    expect(findServerInstrumentation(path.join(base, 'src', 'app'))).toBeNull();

    fs.rmSync(base, { recursive: true, force: true });
  });
});
