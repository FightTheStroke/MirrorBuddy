// @vitest-environment node
/**
 * Guard: scripts/prepare-standalone.mjs must refuse to prepare a standalone
 * package whose compiled server instrumentation is not declared in
 * required-server-files.json and not present in the served tree.
 *
 * Both packaging consumers in the installed Next 16.3.4 source are driven by a
 * single flag: build/index.js:1145-1147 writes the manifest entry and
 * build/utils.js:1103-1105 copies the module into .next/standalone. A build can
 * therefore emit .next/server/instrumentation.js while the manifest omits it,
 * and the standalone package then ships without the hook, silently.
 *
 * These cases exercise the REAL script: its unmodified bytes are copied into a
 * disposable checkout layout and invoked through the Node CLI, exactly as the
 * release path invokes it. No checker is defined here, no repo file is modified,
 * and no real .next is required - every input is a synthetic fixture, so the
 * default unit run works on a clean checkout before any build exists.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const REAL_SCRIPT = path.join(REPO_ROOT, 'scripts', 'prepare-standalone.mjs');
const BUILD_ID = 'fixtureBuildId';

const created: string[] = [];

afterEach(() => {
  while (created.length) {
    fs.rmSync(created.pop() as string, { recursive: true, force: true });
  }
});

function write(file: string, contents: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

interface FixtureOptions {
  /** The canonical build emitted a server instrumentation module. */
  compiled?: boolean;
  /** required-server-files.json lists the instrumentation module. */
  declared?: boolean;
  /** The standalone tree actually carries the module. */
  served?: boolean;
  /** The standalone BUILD_ID matches the canonical one. */
  matchingBuildId?: boolean;
  /** Declare the module under this exact entry instead of the correct one. */
  declaredAs?: string;
  /** Replace required-server-files.json with these raw bytes. */
  rawManifest?: string;
}

/** A disposable checkout holding the unmodified script and a synthetic build. */
function createFixtureCheckout(options: FixtureOptions = {}): string {
  const { compiled = true, declared = true, served = true, matchingBuildId = true } = options;

  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'prepare-standalone-')));
  created.push(root);

  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(REAL_SCRIPT, path.join(root, 'scripts', 'prepare-standalone.mjs'));

  const build = path.join(root, 'apps/web/.next');
  const app = path.join(build, 'standalone/apps/web');

  write(path.join(root, 'apps/web/public/favicon.ico'), 'icon');
  write(path.join(build, 'static/chunks/main.js'), 'chunk');
  write(path.join(build, 'BUILD_ID'), BUILD_ID);
  write(path.join(app, '.next/BUILD_ID'), matchingBuildId ? BUILD_ID : 'otherBuildId');
  write(path.join(app, 'server.js'), '');

  // required-server-files.json entries resolve relative to the app root
  // (apps/web), not to the repository root: the real manifest for this build
  // lists '.next/BUILD_ID', not 'apps/web/.next/BUILD_ID'.
  const files = ['.next/BUILD_ID', '.next/routes-manifest.json'];
  if (compiled) {
    write(path.join(build, 'server/instrumentation.js'), '');
    if (declared) files.push(options.declaredAs ?? '.next/server/instrumentation.js');
    if (served) write(path.join(app, '.next/server/instrumentation.js'), '');
  }
  write(
    path.join(build, 'required-server-files.json'),
    options.rawManifest ?? JSON.stringify({ version: 1, files }),
  );

  return root;
}

function runPrepareStandalone(root: string): { status: number | null; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'prepare-standalone.mjs'), root],
    { encoding: 'utf8' },
  );
  return { status: result.status, stderr: result.stderr };
}

describe('prepare-standalone fixture harness', () => {
  it('runs the unmodified repository script', () => {
    const root = createFixtureCheckout();
    const digest = (file: string) =>
      createHash('sha256').update(fs.readFileSync(file)).digest('hex');

    expect(digest(path.join(root, 'scripts', 'prepare-standalone.mjs'))).toBe(digest(REAL_SCRIPT));
  });

  it('prepares a compliant package and copies its assets', () => {
    const root = createFixtureCheckout();
    const app = path.join(root, 'apps/web/.next/standalone/apps/web');

    const { status } = runPrepareStandalone(root);

    expect(status).toBe(0);
    expect(fs.existsSync(path.join(app, 'public/favicon.ico'))).toBe(true);
    expect(fs.existsSync(path.join(app, '.next/static/chunks/main.js'))).toBe(true);
  });

  it('rejects a mismatched build, proving failures are observable here', () => {
    const root = createFixtureCheckout({ matchingBuildId: false });

    const { status } = runPrepareStandalone(root);

    expect(status).not.toBe(0);
  });
});

describe('prepare-standalone instrumentation completeness', () => {
  it('rejects a package whose compiled instrumentation is undeclared', () => {
    const root = createFixtureCheckout({ declared: false });

    const { status } = runPrepareStandalone(root);

    expect(status).not.toBe(0);
  });

  it('rejects a package that does not serve its compiled instrumentation', () => {
    const root = createFixtureCheckout({ served: false });

    const { status } = runPrepareStandalone(root);

    expect(status).not.toBe(0);
  });

  it('rejects a package that neither declares nor serves it', () => {
    const root = createFixtureCheckout({ declared: false, served: false });

    const { status } = runPrepareStandalone(root);

    expect(status).not.toBe(0);
  });

  it.each([
    ['a checkout-relative prefix', 'apps/web/.next/server/instrumentation.js'],
    ['a bare module name', 'instrumentation.js'],
    ['a look-alike sibling path', '.next/server/app/instrumentation.js'],
    ['a look-alike suffix', '.next/server/instrumentation.js.map'],
  ])('rejects a declaration that resolves elsewhere: %s', (_label, entry) => {
    const root = createFixtureCheckout({ declaredAs: entry });

    const { status } = runPrepareStandalone(root);

    expect(status).not.toBe(0);
  });

  it.each([
    ['invalid JSON', '{'],
    ['a JSON array', '[]'],
    ['no files array', JSON.stringify({ version: 1 })],
    ['non-string entries', JSON.stringify({ version: 1, files: [42] })],
    ['an empty entry', JSON.stringify({ version: 1, files: [''] })],
  ])('rejects a malformed manifest: %s', (_label, rawManifest) => {
    const root = createFixtureCheckout({ rawManifest });

    const { status } = runPrepareStandalone(root);

    expect(status).not.toBe(0);
  });

  it('accepts the exact declaration even when look-alike entries sit beside it', () => {
    const root = createFixtureCheckout({
      rawManifest: JSON.stringify({
        version: 1,
        files: [
          '.next/BUILD_ID',
          'instrumentation.js',
          '.next/server/app/instrumentation.js',
          '.next/server/instrumentation.js',
        ],
      }),
    });

    const { status } = runPrepareStandalone(root);

    expect(status).toBe(0);
  });

  it('accepts a build that compiled no instrumentation at all', () => {
    const root = createFixtureCheckout({ compiled: false });

    const { status } = runPrepareStandalone(root);

    expect(status).toBe(0);
  });
});
