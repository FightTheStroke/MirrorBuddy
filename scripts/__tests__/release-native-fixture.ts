import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function buildFixture(root: string, prepared = true) {
  const build = join(root, 'apps/web/.next');
  const standalone = join(build, 'standalone');
  const app = join(standalone, 'apps/web');
  const files = [
    [join(build, 'BUILD_ID'), 'fixture-build'],
    [join(build, 'server/page.js'), 'original'],
    [join(build, 'static/chunks/app.js'), 'static fixture'],
    [join(root, 'apps/web/public/icon.svg'), '<svg/>'],
    [join(app, 'server.js'), 'module.exports = {};'],
    [join(app, '.next/BUILD_ID'), 'fixture-build'],
    [join(app, '.next/server/page.js'), 'original'],
    [join(standalone, 'node_modules/pg/index.js'), 'module.exports = "pg";'],
  ];
  if (prepared)
    files.push(
      [join(app, '.next/static/chunks/app.js'), 'static fixture'],
      [join(app, 'public/icon.svg'), '<svg/>'],
    );
  for (const [file, contents] of files) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, contents);
  }
  return { build, standalone, app };
}

export function nativeEvidenceFixture(root = '/source') {
  const location = { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } };
  const file = join(root, 'apps/web/src/lib/education/a.ts');
  return {
    unit: {
      success: true,
      numTotalTests: 1,
      numPassedTests: 1,
      numPendingTests: 0,
      numFailedTests: 0,
      numFailedTestSuites: 0,
      testResults: [
        {
          name: join(root, 'apps/web/src/a.test.ts'),
          status: 'passed',
          assertionResults: [{ title: 'case', ancestorTitles: [], status: 'passed' }],
        },
      ],
    },
    coverage: {
      [file]: {
        path: file,
        statementMap: { 0: location },
        s: { 0: 1 },
        fnMap: { 0: { name: 'run', decl: location, loc: location, line: 1 } },
        f: { 0: 1 },
        branchMap: { 0: { loc: location, type: 'if', locations: [location, location], line: 1 } },
        b: { 0: [1, 1] },
      },
    },
    e2e: {
      config: { rootDir: join(root, 'apps/web/e2e'), projects: [{ id: 'chromium' }] },
      errors: [],
      stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 },
      suites: [
        {
          specs: [
            {
              id: 'case-a',
              file: 'a.spec.ts',
              tests: [
                {
                  projectId: 'chromium',
                  status: 'expected',
                  expectedStatus: 'passed',
                  results: [{ status: 'passed' }],
                },
              ],
            },
          ],
        },
      ],
    },
    audit: {
      metadata: {
        vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 },
      },
    },
  };
}

export function fixtureScopes(root: string) {
  const common = { version: 1, sourceRoot: root };
  const policy = 'mirrorbuddy-declared-release-scope-v1';
  const unitList = [
    'node',
    'node_modules/vitest/vitest.mjs',
    'list',
    '--root',
    'apps/web',
    '--allowOnly=false',
  ];
  return {
    unit: {
      ...common,
      kind: 'unit',
      profile: {
        policy,
        command: [...unitList, '--json=<private-output>'],
        filesCommand: [...unitList, '--filesOnly', '--json=<private-output>'],
        declarationsCommand: [
          'node',
          'scripts/lib/release-evidence-scope.mjs',
          '--collect-declarations',
          '<private-output>',
        ],
        declarationsProfile: {
          api: 'vitest/node.createVitest.collect',
          root: 'apps/web',
          watch: false,
          allowOnly: false,
        },
      },
      files: [{ file: 'apps/web/src/a.test.ts', cases: 1 }],
      coverage: ['apps/web/src/lib/education/a.ts'],
    },
    e2e: {
      ...common,
      kind: 'e2e',
      profile: {
        policy,
        command: [
          'node',
          'node_modules/@playwright/test/cli.js',
          'test',
          '--config=apps/web/playwright.config.ts',
          '--list',
          '--reporter=json',
          '--forbid-only',
        ],
        environment: { E2E_TESTS: '1' },
        outputEnvironment: 'PLAYWRIGHT_JSON_OUTPUT_FILE=<private-output>',
      },
      rootDir: join(root, 'apps/web/e2e'),
      projects: ['chromium'],
      files: [{ file: 'apps/web/e2e/a.spec.ts', projectId: 'chromium', cases: 1 }],
    },
  };
}
