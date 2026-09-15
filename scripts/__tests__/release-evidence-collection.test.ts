// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { collect } from '../release-native-evidence.mjs';
import { buildIdentity, digest } from '../lib/release-evidence-inputs.mjs';
import { evidenceDirectory, kinds, recipe, reports } from '../lib/release-evidence-store.mjs';
import { buildFixture, fixtureScopes, nativeEvidenceFixture } from './release-native-fixture';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn(), spawnSync: vi.fn() }));
const roots: string[] = [];
function fixture(expiredKind?: string) {
  const parent = mkdtempSync(join(tmpdir(), 'mb-complete-evidence-'));
  roots.push(parent);
  const root = join(realpathSync(parent), 'source');
  buildFixture(root);
  writeFileSync(join(root, 'package.json'), '{"version":"0.1.0"}');
  mkdirSync(join(root, 'apps/web/src/lib/education'), { recursive: true });
  mkdirSync(join(root, 'apps/web/e2e'), { recursive: true });
  writeFileSync(join(root, 'apps/web/src/a.test.ts'), 'test("case", () => {});');
  writeFileSync(join(root, 'apps/web/src/lib/education/a.ts'), 'export const value = 1;');
  writeFileSync(join(root, 'apps/web/e2e/a.spec.ts'), 'test("case", () => {});');
  const directory = evidenceDirectory(join(parent, 'evidence'), true, root);
  const identity = {
    root,
    revision: 'a'.repeat(40),
    source: 'b'.repeat(64),
    environment: 'c'.repeat(64),
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    pnpm: '10.33.0',
  };
  const data = nativeEvidenceFixture(root);
  for (const [kind, scope] of Object.entries(fixtureScopes(root))) {
    writeFileSync(join(directory, `${kind}.scope.json`), JSON.stringify(scope), { mode: 0o600 });
  }
  const save = () => {
    for (const [name, report] of Object.entries(data)) {
      writeFileSync(join(directory, `${name}.json`), JSON.stringify(report));
    }
    const buildHash = buildIdentity(root);
    for (const kind of kinds) {
      const age = kind === expiredKind ? 3_600_001 : 0;
      const hashes = Object.fromEntries(
        reports(kind).map((name) => [name, digest(readFileSync(join(directory, name)))]),
      );
      writeFileSync(
        join(directory, `${kind}.receipt.json`),
        JSON.stringify({
          version: 1,
          kind,
          exitCode: 0,
          identity,
          command: recipe(kind, directory),
          startedAt: Date.now() - age - 10,
          finishedAt: Date.now() - age,
          reportHashes: hashes,
          buildBefore: kind === 'e2e' ? buildHash : undefined,
          buildAfter: ['pre-release', 'e2e'].includes(kind) ? buildHash : undefined,
        }),
      );
    }
  };
  save();
  return { root, directory, identity, data, save };
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  vi.clearAllMocks();
});
describe('complete native evidence collection', () => {
  it.each(['policy', 'audit'])('rejects expired %s evidence', (kind) => {
    const state = fixture(kind);
    expect(() => collect(state.directory, state.identity)).toThrow(/expired/);
  });
  it('writes a report from all successful bound receipts without executing checks', () => {
    const state = fixture();
    const output = collect(state.directory, state.identity);
    const text = readFileSync(output, 'utf8');
    expect(text).toContain('Unit: 1 passed');
    expect(text).toContain('high 0, critical 0');
    expect(text).toContain('not deployment or live Sentry resolution');
    expect(execFileSync).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });
  it('does not accept a partial gate even when unit/browser reports are green', () => {
    const state = fixture();
    rmSync(join(state.directory, 'policy.receipt.json'));
    expect(() => collect(state.directory, state.identity)).toThrow();
  });
  it('rejects changed served assets despite unchanged canonical build bytes', () => {
    const state = fixture();
    writeFileSync(
      join(state.root, 'apps/web/.next/standalone/apps/web/public/icon.svg'),
      'changed',
    );
    expect(() => collect(state.directory, state.identity)).toThrow();
    expect(execFileSync).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });
  it('rejects native unit results from another checkout even with matching artifact hashes', () => {
    const state = fixture();
    state.data.unit.testResults[0].name = '/another-checkout/a.test.ts';
    state.save();
    expect(() => collect(state.directory, state.identity)).toThrow(/different source checkout/);
  });
  it('rejects browser reports from another scope', () => {
    const state = fixture();
    state.data.e2e.config.rootDir = '/another-checkout';
    state.save();
    expect(() => collect(state.directory, state.identity)).toThrow(/different source checkout/);
  });
  it('rejects coverage from another checkout', () => {
    const state = fixture();
    state.data.coverage[join(state.root, 'apps/web/src/lib/education/a.ts')].path =
      '/another-checkout/a.ts';
    state.save();
    expect(() => collect(state.directory, state.identity)).toThrow(/different source checkout/);
  });
});
