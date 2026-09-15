// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const roots: string[] = [];
function runHealth(ciStatus: number) {
  const root = mkdtempSync(join(tmpdir(), 'health-check-ci-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'bin'));
  copyFileSync(
    join(process.cwd(), 'scripts/health-check.sh'),
    join(root, 'scripts/health-check.sh'),
  );
  writeFileSync(
    join(root, 'scripts/ci-summary.sh'),
    `#!/bin/bash
echo call >> ci-calls.txt
echo '=== CI Summary ==='
echo '[${ciStatus === 0 ? 'PASS' : 'FAIL'}] Lint'
echo '[PASS] Typecheck'
echo '[PASS] Build'
exit ${ciStatus}
`,
    { mode: 0o755 },
  );
  writeFileSync(join(root, 'bin/npx'), '#!/bin/bash\necho "Summary: passed"\n', { mode: 0o755 });
  const result = spawnSync('bash', ['scripts/health-check.sh'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` },
  });
  return {
    ...result,
    calls: readFileSync(join(root, 'ci-calls.txt'), 'utf8').trim().split('\n'),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('health check exposes the CI evidence without running it twice', () => {
  it.each([0, 1])('runs CI exactly once and preserves exit status %i', (status) => {
    const result = runHealth(status);
    expect(result.status, result.stderr).toBe(status);
    expect(result.calls).toEqual(['call']);
    expect(result.stdout).toContain('=== CI Summary ===');
    expect(result.stdout).toContain(`[${status === 0 ? 'PASS' : 'FAIL'}] Lint`);
    expect(result.stdout).toContain('[PASS] Typecheck');
    expect(result.stdout).toContain('[PASS] Build');
    expect(result.stdout).toContain('[PASS] Debt');
    expect(result.stdout).toContain('[PASS] Compliance');
  });

  it.each(['.agents', '.claude'])(
    'keeps %s verification on the one fresh health run',
    (directory) => {
      const skill = readFileSync(
        join(process.cwd(), directory, 'skills/verify-done/SKILL.md'),
        'utf8',
      );
      expect(skill).toContain('already runs `ci-summary.sh`');
      expect(skill).toContain('If code, configuration, dependencies, or environment changed');
      expect(skill).not.toContain('```bash\nnpm run ci:summary\n```');
    },
  );
});
