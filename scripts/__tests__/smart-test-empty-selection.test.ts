// @vitest-environment node
import { afterEach, expect, it } from 'vitest';
import { existsSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupSelectorFixtures, repository, selectorFixture } from './smart-test-fixtures';

afterEach(cleanupSelectorFixtures);

function realFixture(deleted: boolean, failing: boolean) {
  const file = 'apps/web/src/uncovered.ts';
  const fixture = selectorFixture([file]);
  if (deleted) rmSync(join(fixture.root, file));
  symlinkSync(join(repository, 'node_modules'), join(fixture.root, 'node_modules'), 'dir');
  writeFileSync(
    join(fixture.root, 'apps/web/vitest.config.ts'),
    'export default { test: { include: ["**/*.test.ts"], environment: "node", outputFile: "./configured-report.json" } };',
  );
  writeFileSync(
    join(fixture.root, 'apps/web/src/fallback.test.ts'),
    `import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
it('actually executes the fallback', () => {
  writeFileSync(${JSON.stringify(join(fixture.root, 'executed'))}, 'yes');
  expect(${failing}).toBe(false);
});`,
  );
  writeFileSync(
    join(fixture.root, 'bin/npx'),
    `#!/usr/bin/env bash
printf '%s\\0' "$@" >> "$COMMAND_LOG"
printf '\\n' >> "$COMMAND_LOG"
[[ "$1" == vitest ]] || exit 91
shift
exec "$REAL_NODE" "$REAL_CLI" "$@"
`,
    { mode: 0o755 },
  );
  return fixture;
}

it.each([false, true])(
  'requires cloud coverage without running a full local suite for uncovered/deleted source (deleted=%s)',
  (deleted) => {
    const fixture = realFixture(deleted, false);
    const result = fixture.run('smart-test.sh', [], {
      REAL_NODE: process.execPath,
      REAL_CLI: join(repository, 'node_modules/vitest/vitest.mjs'),
    });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(existsSync(join(fixture.root, 'executed'))).toBe(false);
    expect(fixture.calls().some((args) => args[1] === 'run')).toBe(false);
    expect(result.stdout).toContain('Complete unit suite is mandatory in cloud CI');
  },
  30_000,
);

it('propagates an actual failing related test instead of routing failures to cloud', () => {
  const fixture = realFixture(false, true);
  writeFileSync(join(fixture.root, 'changes'), 'apps/web/src/fallback.test.ts\0');
  const result = fixture.run('smart-test.sh', [], {
    REAL_NODE: process.execPath,
    REAL_CLI: join(repository, 'node_modules/vitest/vitest.mjs'),
  });
  expect(result.status, result.stdout + result.stderr).toBe(1);
  expect(existsSync(join(fixture.root, 'executed'))).toBe(true);
  expect(result.stdout + result.stderr).toContain('actually executes the fallback');
}, 30_000);

it.each<Record<string, string>>([{ STUB_STATUS: '9' }, { STUB_STATUS: '1', RUNTIME_ERROR: '1' }])(
  'does not turn an operational failure into an empty-selection fallback (%j)',
  (extra) => {
    const fixture = selectorFixture(['apps/web/src/example.ts']);
    const result = fixture.run('smart-test.sh', [], { EMPTY_RELATED: '1', ...extra });
    expect(result.status).toBe(Number(extra.STUB_STATUS));
    expect(fixture.calls()).toHaveLength(1);
    expect(result.stdout).not.toContain('full unit suite');
  },
);

it('routes configuration-only changes to required cloud coverage without a full local run', () => {
  const fixture = selectorFixture(['package.json']);
  const result = fixture.run('smart-test.sh');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Complete unit suite is mandatory in cloud CI');
  expect(fixture.calls()).toEqual([]);
});
