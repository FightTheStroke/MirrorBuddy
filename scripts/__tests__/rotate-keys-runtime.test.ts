// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RotationProgress } from '../../apps/web/src/lib/security/key-rotation';

const { rotate } = vi.hoisted(() => ({
  rotate: vi.fn<() => Promise<RotationProgress>>(),
}));
vi.mock('dotenv/config', () => ({}));
vi.mock('../../apps/web/src/lib/security/key-rotation', () => ({
  rotateTokenEncryptionKey: rotate,
  rotateSessionKey: rotate,
  rotatePIIEncryptionKey: rotate,
}));
import { runKeyRotation } from '../rotate-keys';

const originalArgv = process.argv;
beforeEach(() => {
  process.argv = [
    'node',
    'vitest',
    '--type=pii',
    '--old-key=synthetic-old',
    '--new-key=synthetic-new',
  ];
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('rotation CLI consumes the real progress contract', () => {
  it('reports processed, succeeded, skipped and failed counts and exits nonzero on failure', async () => {
    rotate.mockResolvedValue({
      total: 5,
      processed: 5,
      succeeded: 2,
      failed: 1,
      phase: 'complete',
    });
    expect(await runKeyRotation()).toBe(1);
    const output = vi.mocked(console.log).mock.calls.flat().join('\n');
    expect(output).toContain('Records Processed: 5');
    expect(output).toContain('Records Succeeded: 2');
    expect(output).toContain('Records Skipped:   2');
    expect(output).toContain('Errors:            1');
    expect(output).not.toContain('undefined');
  });

  it('preserves dry-run flags and successful exit status', async () => {
    process.argv.push('--dry-run');
    rotate.mockResolvedValue({
      total: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      phase: 'complete',
    });
    expect(await runKeyRotation()).toBe(0);
    expect(rotate).toHaveBeenCalledWith('synthetic-old', 'synthetic-new', {
      dryRun: true,
      batchSize: 100,
    });
  });
});
