// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runReadonlyRecovery } from '../lib/readonly-recovery-command';
import { RecoveryError } from '../lib/readonly-recovery-diagnostics';

const env = { NODE_ENV: 'test' } satisfies NodeJS.ProcessEnv;
const mocks = vi.hoisted(() => ({
  target: vi.fn(),
  recover: vi.fn(),
  action: vi.fn(),
  disconnect: vi.fn(),
  end: vi.fn(),
  loadDb: vi.fn(),
  loadRecovery: vi.fn(),
}));
vi.mock('../lib/auth-recovery-target', () => ({ assertAuthRecoveryTarget: mocks.target }));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.doMock('../../apps/web/src/lib/db', () => {
    mocks.loadDb();
    return { prisma: { $disconnect: mocks.disconnect }, dbPool: { end: mocks.end } };
  });
  vi.doMock('../lib/seed-admin-recovery', () => {
    mocks.loadRecovery();
    return { recoverReadonlyAccount: mocks.recover, recoveryAction: mocks.action };
  });
  mocks.action.mockReturnValue('report');
  mocks.recover.mockResolvedValue('CONVERSION_REQUIRED');
});
afterEach(() => vi.restoreAllMocks());

describe('recovery command phase boundaries', () => {
  it('returns success only after both database cleanup operations finish', async () => {
    expect(await runReadonlyRecovery(['report'], env)).toBe('CONVERSION_REQUIRED');
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it('rejects the target before any database import or work', async () => {
    mocks.target.mockImplementation(() => {
      throw new RecoveryError('TARGET_GITHUB_CONTEXT');
    });
    await expect(runReadonlyRecovery([], env)).rejects.toThrow('TARGET_GITHUB_CONTEXT');
    expect(mocks.loadDb).not.toHaveBeenCalled();
    expect(mocks.recover).not.toHaveBeenCalled();
  });
  it('classifies database import failures without returning their message', async () => {
    mocks.loadDb.mockImplementation(() => {
      throw new Error('sensitive database URL');
    });
    await expect(runReadonlyRecovery([], env)).rejects.toThrow(/^DB_IMPORT_FAILED$/);
    expect(mocks.recover).not.toHaveBeenCalled();
  });
  it('cleans up an imported database when recovery module import fails', async () => {
    mocks.loadRecovery.mockImplementation(() => {
      throw new Error('sensitive import path');
    });
    await expect(runReadonlyRecovery([], env)).rejects.toThrow(/^DB_IMPORT_FAILED$/);
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it.each([null, undefined, new Error('secret\nREADONLY_RECOVERY_CONVERTED')])(
    'sanitizes unexpected operation rejection %j and cleans up',
    async (error) => {
      mocks.recover.mockRejectedValue(error);
      await expect(runReadonlyRecovery([], env)).rejects.toThrow(/^DB_OPERATION_FAILED$/);
      expect(mocks.disconnect).toHaveBeenCalledOnce();
      expect(mocks.end).toHaveBeenCalledOnce();
    },
  );
  it('preserves a fixed account rejection', async () => {
    mocks.recover.mockRejectedValue(new RecoveryError('OWNER_REJECTED'));
    await expect(runReadonlyRecovery([], env)).rejects.toThrow(/^OWNER_REJECTED$/);
  });
  it.each(['disconnect', 'end'] as const)(
    'keeps %s failures red without a success',
    async (key) => {
      mocks[key].mockRejectedValue(new Error('secret cleanup details'));
      await expect(runReadonlyRecovery([], env)).rejects.toThrow(/^DISCONNECT_FAILED$/);
      expect(mocks.disconnect).toHaveBeenCalledOnce();
      expect(mocks.end).toHaveBeenCalledOnce();
    },
  );
  it('attempts both cleanups even when one throws synchronously', async () => {
    mocks.disconnect.mockImplementation(() => {
      throw undefined;
    });
    await expect(runReadonlyRecovery([], env)).rejects.toThrow(/^DISCONNECT_FAILED$/);
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});
