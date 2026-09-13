// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { cleanupSelectorFixtures, repository, selectorFixture } from './smart-test-fixtures';

afterEach(cleanupSelectorFixtures);

// `vitest related` cannot establish relatedness for these inputs, so the
// safety fallback runs the complete unit suite. Two measured runs took about
// 553 seconds; keep a finite budget with enough headroom for shared runners.
const SMART_TEST_NESTED_SPAWN_TIMEOUT_MS = 750_000;
const SMART_TEST_NESTED_TEST_TIMEOUT_MS = 780_000;

describe('staged checks', () => {
  it.each(['apps/web/src/example.ts', 'packages/education/src/example.ts'])(
    'checks %s from the repository root',
    (file) => {
      const fixture = selectorFixture([file]);
      expect(fixture.run('smart-test.sh').status).toBe(0);
      expect(fixture.calls()[0]).toEqual(
        expect.arrayContaining([
          'vitest',
          '--root',
          'apps/web',
          join(fixture.root, file),
          '--passWithNoTests=false',
        ]),
      );
      expect(readFileSync(join(fixture.root, 'cwd'), 'utf8').trim()).toBe(fixture.root);
    },
  );

  it('preserves paths containing spaces and command failures', () => {
    const fixture = selectorFixture(['apps/web/src/space name.ts']);
    expect(fixture.run('smart-test.sh', [], { STUB_STATUS: '9' }).status).toBe(9);
    expect(fixture.calls()[0]).toContain(join(fixture.root, 'apps/web/src/space name.ts'));
  });

  it.each(['apps/web/e2e/example.spec.ts', 'apps/web/e2e/fixtures/base.ts'])(
    'collects browser specs for %s',
    (file) => {
      const fixture = selectorFixture([file]);
      expect(fixture.run('smart-test.sh').status).toBe(0);
      expect(fixture.calls()[0]).toEqual(
        expect.arrayContaining(['playwright', '--list', '--config']),
      );
      expect(fixture.calls()[0]).not.toContain('apps/web/e2e/fixtures/base.ts');
    },
  );

  it('explicitly skips unrelated documentation', () => {
    const fixture = selectorFixture(['README.md']);
    expect(fixture.run('smart-test.sh').status).toBe(0);
    expect(fixture.calls()).toEqual([]);
  });

  it.each(['scripts/smart-test.sh', 'scripts/test-affected.sh', '.github/workflows/ci.yml'])(
    'checks selector enforcement when %s changes',
    (file) => {
      const fixture = selectorFixture([file]);
      expect(fixture.run('smart-test.sh').status).toBe(0);
      expect(fixture.calls()[0]).toContain(
        join(fixture.root, 'scripts/__tests__/smart-test-selection.test.ts'),
      );
    },
  );

  it.each(['smart-test.sh', 'test-affected.sh'])('does not hide git failure in %s', (script) => {
    const fixture = selectorFixture([]);
    const result = fixture.run(script, [], { GIT_FAIL: '1' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('git failure');
    expect(result.stdout).not.toContain('skipping tests');
    expect(fixture.calls()).toEqual([]);
  });
});

describe('affected areas', () => {
  it.each<[string, string[]]>([
    ['apps/web/src/components/mobile/panel.tsx', ['src', 'ui', 'mobile']],
    ['packages/ui/src/button.tsx', ['src', 'ui', 'mobile']],
    ['packages/accessibility/src/profile.ts', ['src', 'ui', 'mobile']],
    ['packages/safety/src/filter.ts', ['src', 'safety']],
    ['apps/web/prisma/schema/user.prisma', ['prisma']],
    ['apps/web/e2e/fixtures/base.ts', ['e2e']],
  ])('recognizes %s without losing overlapping areas', (file, areas) => {
    const fixture = selectorFixture([file]);
    const result = fixture.run('test-affected.sh', ['--dry-run']);
    expect(result.status).toBe(0);
    for (const area of areas) expect(result.stdout).toMatch(new RegExp(`${area}:\\s+true`));
    if (areas.includes('e2e')) expect(result.stdout).toContain('--list');
  });

  it('keeps the baseline and propagates failing suite status', () => {
    const fixture = selectorFixture(['README.md']);
    const result = fixture.run('test-affected.sh', [], { STUB_STATUS: '9' });
    expect(result.status).toBe(1);
    expect(fixture.calls()).toHaveLength(2);
    expect(fixture.calls()[0]).toContain('safety');
    expect(fixture.calls()[1]).toContain('accessibility');
    expect(readFileSync(join(fixture.root, 'cwd'), 'utf8').trim()).toBe(fixture.root);
  });

  it('does not present a dry run as passed tests', () => {
    const fixture = selectorFixture(['README.md']);
    const result = fixture.run('test-affected.sh', ['--dry-run']);
    expect(result.stdout).toContain('no test suites were executed');
    expect(result.stdout).not.toContain('All affected test suites passed');
    expect(fixture.calls()).toEqual([]);
  });
});

describe('actual execution and collection', () => {
  it.each([
    'apps/web/src/lib/education/fsrs/index.ts',
    'packages/education/src/fsrs/index.ts',
    'scripts/__tests__/b9-entrypoints.test.ts',
  ])(
    'executes existing tests for %s via an isolated index',
    (file) => {
      const fixture = selectorFixture([]);
      rmSync(join(fixture.root, 'bin/git'));
      const env = { ...fixture.env, GIT_INDEX_FILE: join(fixture.root, 'index') };
      const git = (args: string[], input?: string) =>
        execFileSync('git', args, { cwd: repository, env, encoding: 'utf8', input });
      git(['read-tree', 'HEAD']);
      const blob = git(
        ['hash-object', '-w', '--stdin'],
        `${readFileSync(join(repository, file), 'utf8')}\n`,
      ).trim();
      git(['update-index', '--add', '--cacheinfo', `100644,${blob},${file}`]);
      writeFileSync(
        join(fixture.root, 'bin/npx'),
        `#!/usr/bin/env bash
[[ "$1" == vitest ]] || exit 91
shift
status=0
"$REAL_NODE" "$REAL_CLI" "$@" --maxWorkers=1 || status=$?
for arg in "$@"; do
  if [[ "$arg" == --outputFile=* ]]; then cp "\${arg#--outputFile=}" "$PROOF"; fi
done
exit "$status"
`,
        { mode: 0o755 },
      );
      const proof = join(fixture.root, 'result.json');
      const result = spawnSync('bash', [join(repository, 'scripts/smart-test.sh')], {
        cwd: fixture.root,
        encoding: 'utf8',
        // Measured: a bare `vitest related` scan of this monorepo already
        // takes ~57s before this fixture's extra isolated-git-index/symlink
        // setup; bound it so a genuinely hung nested vitest still fails fast.
        timeout: SMART_TEST_NESTED_SPAWN_TIMEOUT_MS,
        env: {
          ...env,
          REAL_NODE: process.execPath,
          REAL_CLI: join(repository, 'node_modules/vitest/vitest.mjs'),
          PROOF: proof,
        },
      });
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(existsSync(proof)).toBe(true);
      const report = z
        .object({ testResults: z.array(z.object({ name: z.string() })) })
        .parse(JSON.parse(readFileSync(proof, 'utf8')));
      const expected = file.endsWith('.test.ts') ? `/${file}` : '/education/fsrs.test.ts';
      const selected = report.testResults.find((suite) => suite.name.endsWith(expected));
      if (!selected) throw new Error(`Expected actual suite ${expected} for ${file}`);
      process.stdout.write(`Verified selected suite: ${selected.name} for ${file}\n`);
    },
    SMART_TEST_NESTED_TEST_TIMEOUT_MS,
  );

  it('actually rejects invalid await syntax in an isolated importing fixture', () => {
    const fixture = selectorFixture(['apps/web/e2e/fixtures/base.ts']);
    symlinkSync(join(repository, 'node_modules'), join(fixture.root, 'node_modules'), 'dir');
    writeFileSync(
      join(fixture.root, 'apps/web/playwright.config.iteration.ts'),
      'export default { testDir: "./e2e", projects: [{ name: "chromium" }] };',
    );
    writeFileSync(
      join(fixture.root, 'apps/web/e2e/fixtures/base.ts'),
      'export { test } from "@playwright/test";\nexport function broken() { await Promise.resolve(); }\n',
    );
    writeFileSync(
      join(fixture.root, 'apps/web/e2e/example.spec.ts'),
      'import { test } from "./fixtures/base";\ntest("collection only", () => {});\n',
    );
    writeFileSync(
      join(fixture.root, 'bin/npx'),
      `#!/usr/bin/env bash
[[ "$1" == playwright ]] || exit 91
shift
exec "$REAL_NODE" "$REAL_CLI" "$@"
`,
      { mode: 0o755 },
    );
    const result = fixture.run('smart-test.sh', [], {
      REAL_NODE: process.execPath,
      REAL_CLI: join(repository, 'node_modules/@playwright/test/cli.js'),
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('await');
    expect(result.stdout + result.stderr).not.toContain('Running 1 test');
  }, 30_000);
});

describe('actual workflow filter definitions', () => {
  const record = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
  const workflow = record(
    parseYaml(readFileSync(join(repository, '.github/workflows/ci.yml'), 'utf8')),
  );
  const steps = z.array(z.unknown()).parse(record(record(workflow.jobs)['detect-changes']).steps);
  const filter = steps.map(record).find((step) => step.id === 'filter');
  if (!filter) throw new Error('Missing workflow filter');
  const filters = z
    .record(z.string(), z.array(z.string()))
    .parse(parseYaml(z.string().parse(record(filter.with).filters)));
  const matches = (area: string, file: string) => {
    const patterns = filters[area];
    if (!patterns) throw new Error(`Missing filter ${area}`);
    return (
      spawnSync(
        'bash',
        [
          '-c',
          'file=$1; shift; for pattern in "$@"; do [[ "$file" == $pattern ]] && exit 0; done; exit 1',
          '--',
          file,
          ...patterns,
        ],
        { encoding: 'utf8' },
      ).status === 0
    );
  };
  it.each<[string, string[]]>([
    ['packages/ui/src/button.tsx', ['src', 'ui', 'mobile']],
    ['packages/accessibility/src/profile.ts', ['src', 'ui', 'mobile']],
    ['packages/safety/src/filter.ts', ['src', 'safety']],
    ['packages/i18n/src/locales.ts', ['src', 'i18n']],
  ])('selects the intended checks for %s', (file, areas) => {
    for (const area of areas) expect(matches(area, file)).toBe(true);
  });
  it('leaves documentation-only changes outside executable filters', () => {
    for (const area of ['src', 'ui', 'mobile', 'safety', 'i18n', 'prisma', 'e2e', 'config']) {
      expect(matches(area, 'README.md')).toBe(false);
    }
    expect(matches('docs', 'README.md')).toBe(true);
  });
});
