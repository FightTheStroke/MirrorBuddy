// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = resolve(import.meta.dirname, '../..');
const roots: string[] = [];

function releaseFast(smokeStatus = 0, healthStatus = 1, skipBuild = false) {
  const root = mkdtempSync(join(tmpdir(), 'mb-release-fast-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts/lib'), { recursive: true });
  mkdirSync(join(root, 'bin'));
  copyFileSync(join(repository, 'scripts/release-fast.sh'), join(root, 'scripts/release-fast.sh'));
  writeFileSync(
    join(root, 'scripts/lib/build-lock.sh'),
    'acquire_build_lock() { :; }\nrelease_build_lock() { :; }\n',
  );
  writeFileSync(
    join(root, 'bin/npm'),
    `#!/bin/sh
printf 'npm %s port=%s\\n' "$*" "$MIRRORBUDDY_PORT" >> "$TRACE"
if [ "$2" = test:e2e:smoke ]; then exit ${smokeStatus}; fi
exit 0
`,
    { mode: 0o755 },
  );
  writeFileSync(
    join(root, 'bin/curl'),
    `#!/bin/sh
echo curl >> "$TRACE"
exit ${healthStatus}
`,
    { mode: 0o755 },
  );
  writeFileSync(join(root, 'bin/sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const trace = join(root, 'commands.log');
  const result = spawnSync('bash', [join(root, 'scripts/release-fast.sh')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      ...process.env,
      PATH: `${join(root, 'bin')}:${dirname(process.execPath)}:${process.env.PATH}`,
      TRACE: trace,
      MIRRORBUDDY_PORT: '4307',
      RELEASE_FAST_SKIP_BUILD: skipBuild ? '1' : '0',
    },
  });
  return { ...result, commands: readFileSync(trace, 'utf8').trim().split('\n') };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('release fast browser ownership', () => {
  it('always invokes smoke and lets Playwright own startup, even without an existing server', () => {
    const result = releaseFast();
    expect(result.status).toBe(0);
    expect(result.commands.filter((line) => line.startsWith('npm run test:e2e:smoke'))).toEqual([
      'npm run test:e2e:smoke port=4307',
    ]);
    expect(result.commands).not.toContain('curl');
    expect(result.commands.some((line) => line.startsWith('npm run dev'))).toBe(false);
    expect(result.stdout).not.toContain('skipping smoke');
  });

  it('propagates browser startup or smoke failures and never proceeds to build', () => {
    const result = releaseFast(7, 0);
    expect(result.status).toBe(7);
    expect(result.commands.some((line) => line.startsWith('npm run build'))).toBe(false);
    expect(result.stdout).not.toContain('RELEASE FAST PASSED');
  });

  it('keeps smoke mandatory when the optional build is skipped', () => {
    const result = releaseFast(0, 1, true);
    expect(result.status).toBe(0);
    expect(result.commands).toContain('npm run test:e2e:smoke port=4307');
    expect(result.commands.some((line) => line.startsWith('npm run build'))).toBe(false);
  });
});
