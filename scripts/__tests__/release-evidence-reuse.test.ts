// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, realpathSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../release-native-evidence.mjs';
import { readReceipt, root } from '../lib/release-evidence-store.mjs';
import { captureExpectedScope } from '../lib/release-evidence-scope.mjs';
import { runScopeSubprocess } from '../lib/release-evidence-scope-runner.mjs';
import {
  classifyScopeFailure,
  summarizeUnitFailure,
} from '../lib/release-evidence-scope-diagnostics.mjs';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn(), execFileSync: vi.fn(() => '') }));
vi.mock('../lib/release-evidence-inputs.mjs', async (original) => ({
  ...(await original<typeof import('../lib/release-evidence-inputs.mjs')>()),
  inputIdentity: vi.fn(() => ({ source: 'fixture' })),
  buildIdentity: vi.fn(() => 'fixture-build'),
}));
vi.mock('../lib/release-evidence-store.mjs', async (original) => ({
  ...(await original<typeof import('../lib/release-evidence-store.mjs')>()),
  readReceipt: vi.fn(() => ({ exitCode: 0 })),
}));
vi.mock('../lib/release-evidence-scope.mjs', () => ({
  captureExpectedScope: vi.fn(),
  validateExpectedScope: vi.fn(),
}));

const directories: string[] = [];
let failure: ReturnType<typeof spawnSync>;
beforeEach(async () => {
  const { spawnSync: nativeSpawn } =
    await vi.importActual<typeof import('node:child_process')>('node:child_process');
  // File-descriptor stdio returns null streams at runtime, despite Node's declaration.
  failure = nativeSpawn(process.execPath, ['-e', 'process.exit(42)'], {
    stdio: 'ignore',
    timeout: 5_000,
  });
  expect(failure.status).toBe(42);
  vi.mocked(spawnSync).mockReturnValue(failure);
});
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
  vi.clearAllMocks();
});
describe('release execution reuse policy', () => {
  it.each(['absent', 'malformed'])(
    'keeps %s unit reports fail-closed with private log diagnostics',
    (mode) => {
      const directory = mkdtempSync(join(tmpdir(), 'mb-native-report-'));
      directories.push(directory);
      if (mode === 'malformed') writeFileSync(join(directory, 'unit.json'), 'PRIVATE_INVALID_JSON');
      writeFileSync(join(directory, 'unit.log'), 'PRIVATE: ERR_WORKER_OUT_OF_MEMORY');
      expect(summarizeUnitFailure(directory, root)).toBe('class=1 file=0 related=0 assertions=0');
      expect(readReceipt).not.toHaveBeenCalled();
    },
  );
  it('identifies failed unit assertions numerically without publishing private report content', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mb-native-failure-'));
    directories.push(directory);
    vi.mocked(execFileSync).mockReturnValueOnce('apps/web/src/fixture.test.ts\0');
    vi.mocked(spawnSync).mockImplementationOnce((_command, _args, options) => {
      const stdio = options?.stdio;
      if (Array.isArray(stdio) && typeof stdio[2] === 'number')
        writeFileSync(stdio[2], 'PRIVATE_LOG_VALUE');
      writeFileSync(
        join(directory, 'unit.json'),
        JSON.stringify({
          testResults: [
            {
              name: join(root, 'apps/web/src/fixture.test.ts'),
              status: 'failed',
              assertionResults: [
                { status: 'passed' },
                {
                  status: 'failed',
                  fullName: 'PRIVATE_TEST_NAME',
                  failureMessages: ['EACCES PRIVATE'],
                },
              ],
            },
          ],
        }),
      );
      return failure;
    });
    let message = '';
    try {
      run('unit', directory, false);
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain(
      '__NATIVE_FAILURE__ kind=1 exit=42 class=7 file=1 related=1 assertions=1:2',
    );
    expect(message).not.toContain('PRIVATE');
    expect(message).not.toContain('fixture.test.ts');
    expect(readReceipt).not.toHaveBeenCalled();
    expect(readFileSync(join(directory, 'unit.log'), 'utf8')).toContain('PRIVATE_LOG_VALUE');
    expect(statSync(join(directory, 'unit.log')).mode & 0o077).toBe(0);
  });
  it.each(['unit', 'e2e', 'policy', 'audit'])(
    'executes %s even when a reusable green receipt is offered',
    (kind) => {
      const directory = mkdtempSync(join(tmpdir(), 'mb-reuse-policy-'));
      directories.push(directory);
      expect(() => run(kind, directory, true)).toThrow(`${kind} failed`);
      expect(readReceipt).not.toHaveBeenCalled();
      expect(spawnSync).toHaveBeenCalledOnce();
      if (kind === 'unit' || kind === 'e2e')
        expect(captureExpectedScope).toHaveBeenCalledWith(kind, directory, root);
    },
  );
  it('reuses a successfully validated pre-release receipt without rebuilding', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mb-reuse-policy-'));
    directories.push(directory);
    run('pre-release', directory, true);
    expect(readReceipt).toHaveBeenCalledOnce();
    expect(spawnSync).not.toHaveBeenCalled();
    expect(captureExpectedScope).not.toHaveBeenCalled();
  });
});

describe('private-safe scope subprocess diagnostics', () => {
  it.each([1, 3, 5])(
    'rejects timeout at unit discovery stage %s using its bounded collection budget',
    (stage) => {
      vi.mocked(spawnSync).mockReturnValueOnce({
        ...failure,
        status: null,
        signal: 'SIGTERM',
        error: Object.assign(new Error('SECRET_PAYLOAD'), { code: 'ETIMEDOUT' }),
      });
      expect(() =>
        runScopeSubprocess('unit', stage, ['PRIVATE_ARGUMENT'], { cwd: '/private' }),
      ).toThrow(
        `Release scope capture failed: __SCOPE_FAILURE__ kind=1 stage=${stage} reason=1 exit=0`,
      );
      expect(spawnSync).toHaveBeenLastCalledWith(process.execPath, ['PRIVATE_ARGUMENT'], {
        cwd: '/private',
        stdio: 'ignore',
        timeout: stage === 3 ? 300_000 : 900_000,
      });
    },
  );
  it.each(['spawn', 'signal', 'exit'])('classifies %s failures without child payloads', (mode) => {
    const result = { ...failure };
    if (mode === 'spawn') result.error = new Error('SECRET_PAYLOAD');
    if (mode === 'signal') {
      result.status = null;
      result.signal = 'SIGKILL';
    }
    vi.mocked(spawnSync).mockReturnValueOnce(result);
    const reason = mode === 'spawn' ? 2 : mode === 'signal' ? 3 : 4;
    expect(() => runScopeSubprocess('e2e', 1, [], {})).toThrow(
      `Release scope capture failed: __SCOPE_FAILURE__ kind=2 stage=1 reason=${reason} exit=${mode === 'signal' ? 0 : 42}`,
    );
  });
  it('does not run native unit tests or accept a receipt after discovery timeout', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mb-scope-timeout-'));
    directories.push(directory);
    const message =
      'Release scope capture failed: __SCOPE_FAILURE__ kind=1 stage=1 reason=1 exit=0';
    vi.mocked(captureExpectedScope).mockImplementationOnce(() => {
      throw new Error(message);
    });
    expect(() => run('unit', directory, false)).toThrow(message);
    expect(spawnSync).not.toHaveBeenCalled();
    expect(readReceipt).not.toHaveBeenCalled();
  });
});

it('classifies a failed list from private child stderr without exposing its payload', () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'mb-scope-stderr-')));
  directories.push(directory);
  vi.mocked(spawnSync).mockImplementationOnce((_command, _args, options) => {
    const stdio = options?.stdio;
    if (Array.isArray(stdio) && typeof stdio[2] === 'number') {
      writeFileSync(
        stdio[2],
        'PRIVATE_VALUE: FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
      );
    }
    return { ...failure, status: 1 };
  });
  expect(() =>
    runScopeSubprocess('unit', 1, [], { cwd: directory }, { directory, root: directory }),
  ).toThrow('exit=1 class=1 file=0 errno=0');
  const path = join(directory, 'scope-1-1.stderr.log');
  expect(readFileSync(path, 'utf8')).toContain('PRIVATE_VALUE');
  expect(statSync(path).mode & 0o077).toBe(0);
});
it('preserves numeric native spawn errno without exposing its message', () => {
  vi.mocked(spawnSync).mockReturnValueOnce({
    ...failure,
    status: null,
    error: Object.assign(new Error('PRIVATE_VALUE'), { code: 'ENOMEM', errno: -12 }),
  });
  expect(() => runScopeSubprocess('unit', 1, [], {})).toThrow('exit=0 class=0 file=0 errno=-12');
});

it.each([
  ['ERR_WORKER_OUT_OF_MEMORY', 1],
  ['Worker exited unexpectedly', 2],
  ['Cannot find module', 3],
  ['failed to load config', 4],
  ['Transform failed', 5],
  ['No test suite found', 6],
  ['EACCES', 7],
  ['Missing required environment variable', 8],
  ['PRIVATE_VALUE', 0],
])('returns only a numeric category for %s', (message, category) => {
  expect(classifyScopeFailure(message, '/public')).toEqual({ category, file: 0, related: [] });
});

it('indexes only one exact tracked test path and rejects ambiguous or partial matches', () => {
  const files = ['scripts/__tests__/b.test.ts', 'apps/web/src/a.test.ts'];
  expect(
    classifyScopeFailure(
      'Cannot find module at /public/apps/web/src/a.test.ts:2',
      '/public',
      files,
    ),
  ).toEqual({ category: 3, file: 1, related: [1] });
  expect(
    classifyScopeFailure('apps/web/src/a.test.ts scripts/__tests__/b.test.ts', '/public', files),
  ).toEqual({ category: 0, file: 0, related: [1, 2] });
  expect(classifyScopeFailure('xapps/web/src/a.test.ts', '/public', files)).toEqual({
    category: 0,
    file: 0,
    related: [],
  });
});
