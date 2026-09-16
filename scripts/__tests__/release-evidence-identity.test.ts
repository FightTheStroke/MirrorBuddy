// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildIdentity, digest, inputIdentity } from '../lib/release-evidence-inputs.mjs';
import { buildFixture } from './release-native-fixture';
import {
  artifact,
  evidenceDirectory,
  native,
  readReceipt,
  recipe,
} from '../lib/release-evidence-store.mjs';

const repository = resolve(import.meta.dirname, '../..');
const roots: string[] = [];
function fixture() {
  const parent = mkdtempSync(join(tmpdir(), 'mb-evidence-identity-'));
  roots.push(parent);
  const root = join(parent, 'source');
  mkdirSync(root);
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: 'test',
    PATH: process.env.PATH,
    HOME: root,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
  };
  execFileSync('git', ['init', '--quiet', '--template=', root], { env });
  writeFileSync(join(root, '.gitignore'), '.env*\napps/web/.next/\n');
  writeFileSync(join(root, 'source.ts'), 'export const value = 1;\n');
  execFileSync('git', ['-C', root, 'add', '.'], { env });
  execFileSync(
    'git',
    [
      '-C',
      root,
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.com',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '-m',
      'fixture',
    ],
    { env },
  );
  const directory = evidenceDirectory(join(parent, 'evidence'), true, root);
  return { root, directory, parent };
}
function auditFixture() {
  const state = fixture();
  const identity = inputIdentity(state.root, {});
  const audit = JSON.stringify({
    metadata: {
      vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 },
    },
  });
  writeFileSync(join(state.directory, 'audit.json'), audit);
  const receipt = {
    version: 1,
    kind: 'audit',
    exitCode: 0,
    identity,
    command: recipe('audit', state.directory),
    startedAt: Date.now() - 10,
    finishedAt: Date.now(),
    reportHashes: { 'audit.json': digest(audit) },
  };
  const save = () =>
    writeFileSync(join(state.directory, 'audit.receipt.json'), JSON.stringify(receipt));
  save();
  return { ...state, identity, receipt, save };
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('release input and receipt identity', () => {
  it('keeps application coverage output out of the source identity with repository ignore rules', () => {
    const { root } = fixture();
    writeFileSync(join(root, '.gitignore'), readFileSync(join(repository, '.gitignore')));
    const before = inputIdentity(root, {});
    const coverage = join(root, 'apps/web/coverage');
    mkdirSync(coverage, { recursive: true });
    writeFileSync(join(coverage, 'coverage-final.json'), '{}');
    expect(inputIdentity(root, {}).source).toBe(before.source);
  });
  it('explains that a missing completed build requires pre-release verification', () => {
    const { root } = fixture();
    expect(() => buildIdentity(root)).toThrow(/Run pre-release verification before browser checks/);
  });
  it('accepts a matching native execution receipt', () => {
    const state = auditFixture();
    expect(readReceipt('audit', state.directory, state.identity).exitCode).toBe(0);
  });
  it('invalidates tracked and untracked source changes without requiring a new commit', () => {
    const { root } = fixture();
    const before = inputIdentity(root, {});
    writeFileSync(join(root, 'source.ts'), 'export const value = 2;\n');
    const changed = inputIdentity(root, {});
    expect(changed.revision).toBe(before.revision);
    expect(changed.source).not.toBe(before.source);
    writeFileSync(join(root, 'new file.ts'), 'export {};\n');
    expect(inputIdentity(root, {}).source).not.toBe(changed.source);
  });
  it('binds local environment files and runtime inputs without recording their values', () => {
    const { root } = fixture();
    const before = inputIdentity(root, {});
    writeFileSync(join(root, '.env.local'), 'SECRET=synthetic-private-canary\n');
    const after = inputIdentity(root, { SECRET: 'synthetic-private-canary' });
    expect(after.source).not.toBe(before.source);
    expect(after.environment).not.toBe(before.environment);
    expect(JSON.stringify(after)).not.toContain('synthetic-private-canary');
    expect(
      inputIdentity(root, {
        SECRET: 'synthetic-private-canary',
        npm_lifecycle_event: 'release:evidence',
        npm_lifecycle_script: 'scripts/release-evidence-pack.sh',
      }).environment,
    ).toBe(after.environment);
  });
  it.each(['revision', 'source', 'environment', 'node'])('rejects stale %s identity', (key) => {
    const state = auditFixture();
    expect(() =>
      readReceipt('audit', state.directory, {
        ...state.identity,
        [key]: 'different',
      }),
    ).toThrow();
  });
  it('rejects failed executions or a narrowed command scope', () => {
    const state = auditFixture();
    state.receipt.exitCode = 1;
    state.save();
    expect(() => readReceipt('audit', state.directory, state.identity)).toThrow();
    state.receipt.exitCode = 0;
    state.receipt.command.push('--prod');
    state.save();
    expect(() => readReceipt('audit', state.directory, state.identity)).toThrow();
  });
  it('rejects report replacement and future timestamps', () => {
    const state = auditFixture();
    writeFileSync(join(state.directory, 'audit.json'), '{}');
    expect(() => readReceipt('audit', state.directory, state.identity)).toThrow();
    state.receipt.finishedAt = Date.now() + 60_000;
    state.save();
    expect(() => readReceipt('audit', state.directory, state.identity)).toThrow();
  });
  it.each([
    'server/page.js',
    'standalone/apps/web/server.js',
    'standalone/node_modules/pg/index.js',
  ])('rejects changed build bytes in %s even when source is unchanged', (file) => {
    const { root, directory } = fixture();
    const { build } = buildFixture(root);
    const identity = inputIdentity(root, {});
    const receipt = {
      version: 1,
      kind: 'pre-release',
      exitCode: 0,
      identity,
      command: recipe('pre-release', directory),
      startedAt: Date.now() - 10,
      finishedAt: Date.now(),
      reportHashes: {},
      buildAfter: buildIdentity(root),
    };
    writeFileSync(join(directory, 'pre-release.receipt.json'), JSON.stringify(receipt));
    expect(readReceipt('pre-release', directory, identity).exitCode).toBe(0);
    writeFileSync(join(build, file), 'changed');
    expect(inputIdentity(root, {}).source).toBe(identity.source);
    expect(() => readReceipt('pre-release', directory, identity)).toThrow();
  });
  it('rejects escaping artifact paths and dangling links', () => {
    const { directory } = fixture();
    expect(() => artifact(directory, '../secret')).toThrow();
    symlinkSync('/nonexistent-evidence-target', join(directory, 'audit.json'));
    expect(() => artifact(directory, 'audit.json')).toThrow();
  });
  it('does not reveal malformed artifact contents', () => {
    const { directory } = fixture();
    writeFileSync(join(directory, 'audit.json'), 'synthetic-private-canary');
    expect(() => native(directory, 'audit.json')).toThrow(
      /^Missing or invalid native JSON artifact: audit.json$/,
    );
  });
  it('rejects in-checkout or unrecognized output directories without overwriting data', () => {
    const { root, parent } = fixture();
    expect(() => evidenceDirectory(root, true, root)).toThrow();
    const other = join(parent, 'other');
    mkdirSync(other);
    writeFileSync(join(other, 'keep.txt'), 'retain');
    expect(() => evidenceDirectory(other, true, root)).toThrow();
    expect(readFileSync(join(other, 'keep.txt'), 'utf8')).toBe('retain');
  });
  it('collects nothing and launches no tests when receipts are missing', () => {
    const { directory, parent } = fixture();
    const bin = join(parent, 'bin');
    const calls = join(parent, 'calls.jsonl');
    mkdirSync(bin);
    for (const tool of ['npm', 'npx', 'pnpm', 'vercel']) {
      writeFileSync(
        join(bin, tool),
        `#!${process.execPath}
require('node:fs').appendFileSync(${JSON.stringify(calls)}, JSON.stringify({
  tool: ${JSON.stringify(tool)}, args: process.argv.slice(2),
}) + '\\n');
if (${JSON.stringify(tool)} === 'pnpm' && process.argv[2] === '--version') console.log('10.33.0');
`,
        { mode: 0o755 },
      );
    }
    const result = spawnSync(
      'bash',
      [join(repository, 'scripts/release-evidence-pack.sh'), directory],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Release evidence rejected');
    expect(result.stdout).not.toMatch(/passed|RUN  v/);
    expect(readdirSync(directory)).toEqual(['format.json']);
    expect(
      readFileSync(calls, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    ).toEqual([{ tool: 'pnpm', args: ['--version'] }]);
  });
});
