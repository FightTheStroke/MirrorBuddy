// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../release-native-evidence.mjs';
import { readReceipt, root } from '../lib/release-evidence-store.mjs';
import { captureExpectedScope } from '../lib/release-evidence-scope.mjs';
import { runScopeSubprocess } from '../lib/release-evidence-scope-runner.mjs';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));
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
    'identifies timeout at unit discovery stage %s without extending the limit',
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
        timeout: 300_000,
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
