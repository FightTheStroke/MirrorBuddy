// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { captureExpectedScope, validateExpectedScope } from '../lib/release-evidence-scope.mjs';
vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));
let root: string;
let directory: string;
let inventory: { name: string; file: string }[];
let files: string[];
let skipped: number;
let coverage: Record<string, { path: string }>;
const caseSource = "import { test } from 'vitest'; test('case', () => {});";
const put = (file: string, value: unknown) =>
  writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
const source = (file: string, contents: string) => {
  const absolute = join(root, file);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, contents);
  return absolute;
};
const assertion = (status = 'passed') => ({
  ancestorTitles: ['suite'],
  title: 'volatile parameterized title',
  status,
});
const report = () => ({
  numTotalTests: inventory.length + skipped,
  testResults: files.map((name) => ({
    name,
    assertionResults: [
      ...inventory.filter((test) => test.file === name).map(() => assertion()),
      ...Array.from({ length: name === files[0] ? skipped : 0 }, () => assertion('skipped')),
    ],
  })),
});
const browser = (discovery = true) => ({
  config: {
    rootDir: join(root, 'apps/web/e2e'),
    projects: ['chromium', 'firefox', 'optional'].map((id) => ({ id })),
  },
  errors: [],
  stats: { expected: discovery ? 0 : 4, skipped: discovery ? 4 : 0, unexpected: 0, flaky: 0 },
  suites: [
    {
      specs: ['flow.spec.ts', 'other.spec.ts'].map((file) => ({
        id: file,
        file,
        tests: ['chromium', 'firefox'].map((projectId) => ({
          projectId,
          projectName: projectId,
          results: discovery ? [] : [{ status: 'passed' }],
          status: discovery ? 'skipped' : 'expected',
          expectedStatus: 'passed',
        })),
      })),
    },
  ],
});
const writeReports = () => {
  put(join(directory, 'unit.json'), report());
  put(join(directory, 'coverage.json'), coverage);
};

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'scope-source-')));
  directory = realpathSync(mkdtempSync(join(tmpdir(), 'scope-evidence-')));
  skipped = 0;
  files = [
    source('apps/web/src/a.test.ts', `${caseSource} test('second', () => {});`),
    source('apps/web/src/b.test.tsx', caseSource),
    source('scripts/__tests__/c.test.ts', caseSource),
    source('apps/web/src/empty.spec.ts', 'export {};'),
  ];
  inventory = files
    .slice(0, 3)
    .flatMap((file, index) =>
      Array.from({ length: index === 0 ? 2 : 1 }, (_, n) => ({ name: `suite > case ${n}`, file })),
    );
  const covered = [
    source('apps/web/src/lib/education/fsrs.ts', 'export const interval = () => 1;'),
    source(
      'apps/web/src/lib/pdf-generator/components/title.tsx',
      'export const Title = () => null;',
    ),
  ];
  source('apps/web/src/lib/education/example-flashcard.tsx', 'export const Example = () => null;');
  source('apps/web/src/lib/education/ignored.d.ts', 'export declare const value: number;');
  source('apps/web/src/lib/education/ignored.config.ts', 'export default {};');
  for (const file of ['flow.spec.ts', 'other.spec.ts'])
    source(
      `apps/web/e2e/${file}`,
      "import { test } from '@playwright/test'; test('flow', () => {});",
    );
  coverage = Object.fromEntries(covered.map((path) => [path, { path }]));
  vi.mocked(spawnSync).mockImplementation((_command, args, options) => {
    const argv = args as string[];
    if (argv[1] === '--collect-declarations') {
      put(
        argv[2],
        files.map((file) => ({
          file,
          eligible: inventory.filter((test) => test.file === file).length,
          cases:
            inventory.filter((test) => test.file === file).length +
            (file === files[0] ? skipped : 0),
        })),
      );
      return { status: 0, signal: null, pid: 1, output: [], stdout: '', stderr: '' };
    }
    const destination = argv.find((arg) => arg.startsWith('--json='))?.slice(7);
    if (destination)
      put(destination, argv.includes('--filesOnly') ? files.map((file) => ({ file })) : inventory);
    else put(options?.env?.PLAYWRIGHT_JSON_OUTPUT_FILE as string, browser());
    return { status: 0, signal: null, pid: 1, output: [], stdout: '', stderr: '' };
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  rmSync(root, { recursive: true });
  rmSync(directory, { recursive: true });
});
describe('independent release scope', () => {
  it('accepts exact declared counts, empty discovered files and existing coverage policy only', () => {
    captureExpectedScope('unit', directory, root);
    writeReports();
    const calls = vi.mocked(spawnSync).mock.calls.length;
    expect(validateExpectedScope('unit', directory, root)).toBeTruthy();
    expect(spawnSync).toHaveBeenCalledTimes(calls);
    const commands = vi.mocked(spawnSync).mock.calls.slice(0, 2);
    expect(commands.every((call) => call[1]?.includes('--allowOnly=false'))).toBe(true);
  });
  it('counts native skipped declarations exactly, rejecting omitted skipped assertions', () => {
    skipped = 2;
    captureExpectedScope('unit', directory, root);
    writeReports();
    expect(validateExpectedScope('unit', directory, root)).toBeTruthy();
    skipped = 1;
    put(join(directory, 'unit.json'), report());
    expect(() => validateExpectedScope('unit', directory, root)).toThrow();
  });
  it.each(['case', 'file'])('rejects consistent partial unit %s reports', (change) => {
    captureExpectedScope('unit', directory, root);
    if (change === 'case') inventory.shift();
    else files.shift();
    inventory = inventory.filter((test) => files.includes(test.file));
    writeReports();
    expect(() => validateExpectedScope('unit', directory, root)).toThrow();
  });
  it('rejects missing coverage paths and accepts valid instrumented extras', () => {
    captureExpectedScope('unit', directory, root);
    put(join(directory, 'unit.json'), report());
    const extra = source('apps/web/src/extra.ts', 'export const extra = 1;');
    coverage[extra] = { path: extra };
    put(join(directory, 'coverage.json'), coverage);
    expect(validateExpectedScope('unit', directory, root)).toBeTruthy();
    delete coverage[Object.keys(coverage)[0]];
    put(join(directory, 'coverage.json'), coverage);
    expect(() => validateExpectedScope('unit', directory, root)).toThrow();
  });
  it('requires independent filesystem scope to agree with native file discovery', () => {
    source('apps/web/scripts/__tests__/optional.test.ts', caseSource);
    expect(() => captureExpectedScope('unit', directory, root)).toThrow();
  });
  it('rejects malformed discovery without exposing child output', () => {
    vi.mocked(spawnSync).mockImplementationOnce(() => {
      throw new Error('SECRET_PAYLOAD');
    });
    expect(() => captureExpectedScope('unit', directory, root)).toThrow(
      'Release scope capture failed',
    );
    inventory[0].name = '';
    expect(() => captureExpectedScope('unit', directory, root)).toThrow();
  });
  it('rejects empty discovery, including a files-only inventory with no declared cases', () => {
    inventory = [];
    expect(() => captureExpectedScope('unit', directory, root)).toThrow();
  });
  it('rejects changed command identity, wrong roots, malformed and missing artifacts', () => {
    const scope = captureExpectedScope('unit', directory, root);
    const path = join(directory, 'unit.scope.json');
    put(path, { ...scope, sourceRoot: directory });
    expect(() => validateExpectedScope('unit', directory, root)).toThrow();
    put(path, { ...scope, profile: {} });
    expect(() => validateExpectedScope('unit', directory, root)).toThrow();
    writeFileSync(path, '{SECRET_PAYLOAD');
    expect(() => validateExpectedScope('unit', directory, root)).toThrow(
      'Release scope validation failed',
    );
    rmSync(path);
    expect(() => validateExpectedScope('unit', directory, root)).toThrow();
  });
  it('rejects invalid kinds, nonprivate directories, symlink artifacts and outside source paths', () => {
    expect(() => captureExpectedScope('audit', directory, root)).toThrow();
    chmodSync(directory, 0o755);
    expect(() => captureExpectedScope('unit', directory, root)).toThrow();
    chmodSync(directory, 0o700);
    symlinkSync(join(root, 'victim.json'), join(directory, 'unit.scope.json'));
    expect(() => captureExpectedScope('unit', directory, root)).toThrow();
    rmSync(join(directory, 'unit.scope.json'));
    inventory[0].file = join(directory, 'outside.test.ts');
    expect(() => captureExpectedScope('unit', directory, root)).toThrow();
  });
  it.each([undefined, '0'])('pins browser discovery environment over inherited %s', (inherited) => {
    vi.stubEnv('E2E_TESTS', inherited);
    const scope = captureExpectedScope('e2e', directory, root);
    expect(vi.mocked(spawnSync).mock.calls[0][2]?.env?.E2E_TESTS).toBe('1');
    expect(scope.profile).toHaveProperty('environment.E2E_TESTS', '1');
    expect(process.env.E2E_TESTS).toBe(inherited);
    put(join(directory, 'e2e.json'), browser(false));
    const calls = vi.mocked(spawnSync).mock.calls.length;
    expect(validateExpectedScope('e2e', directory, root)).toBeTruthy();
    expect(spawnSync).toHaveBeenCalledTimes(calls);
    expect(vi.mocked(spawnSync).mock.calls[0][1]).not.toContain('--project=chromium');
    for (const environment of [undefined, { E2E_TESTS: '0' }]) {
      const profile = { ...scope.profile, environment };
      put(join(directory, 'e2e.scope.json'), { ...scope, profile });
      expect(() => validateExpectedScope('e2e', directory, root)).toThrow();
    }
  });
  it.each(['file', 'project', 'root', 'case'])(
    'rejects browser %s omissions or substitutions',
    (change) => {
      captureExpectedScope('e2e', directory, root);
      const actual = browser(false);
      if (change === 'file') actual.suites[0].specs.pop();
      if (change === 'project') {
        actual.config.projects = actual.config.projects.filter((p) => p.id !== 'firefox');
        actual.suites[0].specs.forEach((spec) => spec.tests.splice(1, 1));
      }
      if (change === 'root') actual.config.rootDir = directory;
      if (change === 'case') actual.suites[0].specs[0].tests.pop();
      actual.stats.expected = actual.suites[0].specs.reduce((n, spec) => n + spec.tests.length, 0);
      put(join(directory, 'e2e.json'), actual);
      expect(() => validateExpectedScope('e2e', directory, root)).toThrow();
    },
  );
});
