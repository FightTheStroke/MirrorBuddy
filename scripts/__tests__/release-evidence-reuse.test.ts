// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../release-native-evidence.mjs';
import { readReceipt, root } from '../lib/release-evidence-store.mjs';
import { captureExpectedScope } from '../lib/release-evidence-scope.mjs';

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
beforeEach(() => {
  vi.mocked(spawnSync).mockReturnValue({
    pid: 0,
    output: [],
    stdout: null,
    stderr: null,
    status: 42,
    signal: null,
  });
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
