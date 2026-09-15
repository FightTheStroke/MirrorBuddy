// @vitest-environment node
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepareStandalone } from '../prepare-standalone.mjs';
import { buildIdentity } from '../lib/release-evidence-inputs.mjs';
import { buildFixture } from './release-native-fixture';

let root: string;
let build: string;
let standalone: string;
let app: string;
beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'mb-standalone-')));
  ({ build, standalone, app } = buildFixture(root));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('standalone served-tree identity', () => {
  it.each(['server.js', '.next/server/page.js', '.next/static/chunks/app.js', 'public/icon.svg'])(
    'binds changed standalone %s while canonical build bytes stay unchanged',
    (file) => {
      const before = buildIdentity(root);
      writeFileSync(join(app, file), 'changed served bytes');
      expect(buildIdentity(root)).not.toBe(before);
      expect(readFileSync(join(build, 'server/page.js'), 'utf8')).toBe('original');
      expect(readFileSync(join(build, 'static/chunks/app.js'), 'utf8')).toBe('static fixture');
    },
  );
  it('allows in-tree package links and binds their target bytes and link identity', () => {
    const modules = join(app, '.next/node_modules');
    mkdirSync(modules);
    const link = join(modules, 'pg-hash');
    const target = join(standalone, 'node_modules/pg');
    symlinkSync(relative(modules, target), link);
    const before = buildIdentity(root);
    writeFileSync(join(target, 'index.js'), 'changed dependency');
    const changed = buildIdentity(root);
    expect(changed).not.toBe(before);
    rmSync(link);
    symlinkSync(target, link);
    expect(buildIdentity(root)).not.toBe(changed);
  });
  it.each(['external', 'dangling', 'cycle'])('rejects %s standalone links', (kind) => {
    const link = join(standalone, 'unsafe');
    const target =
      kind === 'external' ? root : kind === 'dangling' ? join(standalone, 'absent') : link;
    symlinkSync(target, link);
    expect(() => buildIdentity(root)).toThrow();
  });
  it.each(['server.js', '.next/BUILD_ID', '.next/static', 'public'])(
    'requires prepared standalone %s',
    (file) => {
      rmSync(join(app, file), { recursive: true });
      expect(() => buildIdentity(root)).toThrow();
    },
  );
  it('rejects a standalone BUILD_ID from another canonical build', () => {
    writeFileSync(join(app, '.next/BUILD_ID'), 'different-build');
    expect(() => buildIdentity(root)).toThrow();
    expect(() => prepareStandalone(root)).toThrow();
  });
  it('rejects an escaping standalone root', () => {
    const actual = join(root, 'elsewhere');
    mkdirSync(actual);
    rmSync(standalone, { recursive: true });
    symlinkSync(actual, standalone);
    expect(() => buildIdentity(root)).toThrow();
    expect(() => prepareStandalone(root)).toThrow();
  });
});

describe('safe standalone asset preparation', () => {
  it('runs the helper CLI without an application build and returns a failure on invalid assets', () => {
    const helper = resolve(import.meta.dirname, '../prepare-standalone.mjs');
    const run = () =>
      spawnSync(process.execPath, [helper, root], { encoding: 'utf8', timeout: 10_000 });
    expect(run().status).toBe(0);
    rmSync(join(root, 'apps/web/public'), { recursive: true });
    const failed = run();
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('Standalone preparation failed');
  });
  it('retains extra destination files and includes them in the served build identity', () => {
    const before = buildIdentity(root);
    writeFileSync(join(app, 'public/retained.txt'), 'retained');
    prepareStandalone(root);
    expect(readFileSync(join(app, 'public/retained.txt'), 'utf8')).toBe('retained');
    expect(buildIdentity(root)).not.toBe(before);
  });
  it('copies contents idempotently without nested directories or changing source assets', () => {
    rmSync(join(app, 'public'), { recursive: true });
    rmSync(join(app, '.next/static'), { recursive: true });
    prepareStandalone(root);
    const before = buildIdentity(root);
    prepareStandalone(root);
    expect(buildIdentity(root)).toBe(before);
    expect(readFileSync(join(app, 'public/icon.svg'), 'utf8')).toBe('<svg/>');
    expect(readFileSync(join(root, 'apps/web/public/icon.svg'), 'utf8')).toBe('<svg/>');
    expect(readdirSync(join(app, '.next/static'))).toEqual(['chunks']);
    writeFileSync(join(build, 'static/chunks/app.js'), 'fresh static');
    prepareStandalone(root);
    expect(readFileSync(join(app, '.next/static/chunks/app.js'), 'utf8')).toBe('fresh static');
    expect(readFileSync(join(build, 'static/chunks/app.js'), 'utf8')).toBe('fresh static');
  });
  it.each(['directory', 'file', 'hardlink', 'internal-link'])(
    'rejects a linked %s destination without modifying its target or source',
    (kind) => {
      const source = join(root, 'apps/web/public/icon.svg');
      const external = join(root, 'outside');
      mkdirSync(external);
      writeFileSync(join(external, 'icon.svg'), 'preserve');
      const destination = kind === 'directory' ? join(app, 'public') : join(app, 'public/icon.svg');
      rmSync(destination, { recursive: true });
      if (kind === 'hardlink') linkSync(source, destination);
      else
        symlinkSync(
          kind === 'directory'
            ? external
            : kind === 'internal-link'
              ? source
              : join(external, 'icon.svg'),
          destination,
        );
      expect(() => prepareStandalone(root)).toThrow();
      expect(readFileSync(source, 'utf8')).toBe('<svg/>');
      expect(readFileSync(join(external, 'icon.svg'), 'utf8')).toBe('preserve');
    },
  );
  it('rejects linked source assets before writing destinations', () => {
    rmSync(join(app, 'public'), { recursive: true });
    symlinkSync(join(root, 'apps/web/public/icon.svg'), join(build, 'static/link.js'));
    expect(() => prepareStandalone(root)).toThrow();
    expect(existsSync(join(app, 'public'))).toBe(false);
  });
  it('rejects missing source assets without treating missing I/O as success', () => {
    rmSync(join(root, 'apps/web/public'), { recursive: true });
    expect(() => prepareStandalone(root)).toThrow();
  });
  it.each([undefined, null, '', '../outside'])('rejects invalid source root %s', (value) => {
    expect(() => prepareStandalone(value)).toThrow();
  });
});
