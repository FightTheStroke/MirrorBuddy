// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const roots: string[] = [];
function preflight(
  performance: boolean,
  sizeStatus?: number,
  preparationStatus = 0,
  buildStatus = 0,
) {
  const root = mkdtempSync(join(tmpdir(), 'mb-release-preflight-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts/lib'), { recursive: true });
  mkdirSync(join(root, 'bin'));
  copyFileSync(
    join(repository, 'scripts/pre-release-check.sh'),
    join(root, 'scripts/pre-release-check.sh'),
  );
  writeFileSync(
    join(root, 'scripts/lib/build-lock.sh'),
    'acquire_build_lock() { :; }\nrelease_build_lock() { :; }\n',
  );
  writeFileSync(
    join(root, 'scripts/lib/checks.sh'),
    'exec_hygiene() { _OUTPUT="$TEMP_DIR/hygiene.log"; : > "$_OUTPUT"; _EXIT=0; }\n',
  );
  writeFileSync(
    join(root, 'scripts/prepare-standalone.mjs'),
    `import { writeFileSync } from 'node:fs';
writeFileSync('prepared.marker', 'prepared');
process.exit(${preparationStatus});\n`,
  );
  for (const name of ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'CLAUDE.md']) {
    writeFileSync(join(root, name), 'Fixture');
  }
  for (const tool of ['npm', 'npx', 'pnpm']) {
    writeFileSync(
      join(root, 'bin', tool),
      `#!/bin/sh
if [ "$1" = run ] && [ "$2" = build ]; then exit ${buildStatus}; fi
exit 0\n`,
      { mode: 0o755 },
    );
  }
  if (performance) {
    writeFileSync(join(root, 'scripts/perf-check.sh'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  }
  if (sizeStatus !== undefined) {
    writeFileSync(
      join(root, 'scripts/check-file-size.sh'),
      `#!/bin/sh\necho "File-size inspection result"\nexit ${sizeStatus}\n`,
      { mode: 0o755 },
    );
  }
  const result = spawnSync('bash', [join(root, 'scripts/pre-release-check.sh')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      ...process.env,
      PATH: `${join(root, 'bin')}:${dirname(process.execPath)}:${process.env.PATH}`,
    },
  });
  return { ...result, prepared: existsSync(join(root, 'prepared.marker')) };
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
describe('pre-release required inspection callers', () => {
  it('rejects a missing performance checker', () => {
    expect(preflight(false, 0).status).toBe(1);
  });
  it('rejects a missing file-size checker', () => {
    expect(preflight(true).status).toBe(1);
  });
  it('propagates file-size inventory failures rather than swallowing them as warnings', () => {
    expect(preflight(true, 1).status).toBe(1);
  });
  it('preserves successful warning-only size checks without suggesting duplicate browser runs', () => {
    const result = preflight(true, 0);
    expect(result.status).toBe(0);
    expect(result.prepared).toBe(true);
    expect(result.stdout).toContain('File-size inspection result');
    expect(result.stdout).not.toContain('Run E2E tests: npm run test');
  });
  it('fails pre-release if standalone preparation fails after a successful build', () => {
    const result = preflight(true, 0, 1);
    expect(result.status).toBe(1);
    expect(result.prepared).toBe(true);
    expect(result.stdout).toContain('Standalone preparation failed');
  });
  it('does not prepare standalone output after a failed build', () => {
    const result = preflight(true, 0, 0, 1);
    expect(result.status).toBe(1);
    expect(result.prepared).toBe(false);
  });
});
