// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mocks = vi.hoisted(() => ({
  issue: vi.fn(),
  revoke: vi.fn(),
  disconnect: vi.fn(),
  end: vi.fn(),
  directory: vi.fn(),
  receipt: vi.fn(),
  token: vi.fn(),
  read: vi.fn(),
  remove: vi.fn(),
  finish: vi.fn(),
}));
vi.mock('../../apps/web/src/lib/auth/readonly-smoke', () => ({
  issueReadonlySmokeSession: mocks.issue,
  revokeReadonlySmokeSession: mocks.revoke,
}));
vi.mock('../../apps/web/src/lib/db', () => ({
  prisma: { $disconnect: mocks.disconnect },
  dbPool: { end: mocks.end },
}));
vi.mock('../lib/readonly-smoke-files', () => ({
  privateSmokeDirectory: mocks.directory,
  persistSmokeReceipt: mocks.receipt,
  publishSmokeToken: mocks.token,
  readSmokeReceipt: mocks.read,
  removeSmokeToken: mocks.remove,
  finishSmokeCleanup: mocks.finish,
}));
import { runReadonlySmokeCommand } from '../lib/readonly-smoke-command';

const directory = join(tmpdir(), 'readonly-smoke-command-unit');
const args = ['issue', '--target', 'synthetic', '--directory', directory];
const receipt = 'private-test-receipt';
const token = 'private-test-token';

beforeEach(() => {
  vi.resetAllMocks();
  const local = 'postgresql://fixture@127.0.0.1:5432/mirrorbuddy_remediation_47ba2c29';
  vi.stubEnv('DATABASE_URL', local);
  vi.stubEnv('DIRECT_URL', local);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ADMIN_READONLY_EMAIL', 'readonly@example.test');
  vi.stubEnv('SESSION_SECRET', 'synthetic-readonly-command-secret-at-least-32-chars');
  vi.stubEnv('E2E_TESTS', '');
  vi.stubEnv('VERCEL', '');
  mocks.directory.mockResolvedValue(directory);
  mocks.issue.mockImplementation(async (persist: (value: string) => Promise<void>) => {
    await persist(receipt);
    return { token };
  });
  mocks.read.mockResolvedValue(receipt);
  mocks.revoke.mockResolvedValue({ status: 'revoked' });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('readonly smoke command orchestration', () => {
  it('journals before publishing and never publishes a job output or console token', async () => {
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    await runReadonlySmokeCommand(args);
    expect(mocks.receipt.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.token.mock.invocationCallOrder[0],
    );
    expect(mocks.token).toHaveBeenCalledWith(directory, token);
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    error.mockRestore();
  });
  it('removes the bearer, confirms scoped revocation, then cleans receipt/directory', async () => {
    await runReadonlySmokeCommand(['revoke', ...args.slice(1)]);
    expect(mocks.revoke).toHaveBeenCalledWith(receipt);
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.revoke.mock.invocationCallOrder[0],
    );
    expect(mocks.revoke.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.finish.mock.invocationCallOrder[0],
    );
    expect(mocks.token).not.toHaveBeenCalled();
  });
  it('blocks success and retains recovery authority when revocation fails', async () => {
    mocks.revoke.mockRejectedValue(new Error('private database error'));
    await expect(runReadonlySmokeCommand(['revoke', ...args.slice(1)])).rejects.toThrow(
      'REVOCATION_FAILED',
    );
    expect(mocks.remove).toHaveBeenCalled();
    expect(mocks.finish).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it('reclaims an issued row after publication failure without reporting issuance success', async () => {
    mocks.token.mockRejectedValue(new Error('disk full'));
    await expect(runReadonlySmokeCommand(args)).rejects.toThrow('ISSUANCE_FAILED');
    expect(mocks.remove).toHaveBeenCalled();
    expect(mocks.revoke).toHaveBeenCalledWith(receipt);
    expect(mocks.finish).not.toHaveBeenCalled();
  });
  it('still attempts revocation when local bearer removal fails', async () => {
    mocks.token.mockRejectedValue(new Error('publication failed'));
    mocks.remove.mockRejectedValue(new Error('unlink failed'));
    await expect(runReadonlySmokeCommand(args)).rejects.toThrow();
    expect(mocks.revoke).toHaveBeenCalledWith(receipt);
    expect(mocks.finish).not.toHaveBeenCalled();
  });
  it('reports failed automatic reclamation and retains the journal for the independent cleanup step', async () => {
    mocks.token.mockRejectedValue(new Error('publication failed'));
    mocks.revoke.mockRejectedValue(new Error('revocation failed'));
    await expect(runReadonlySmokeCommand(args)).rejects.toThrow('REVOCATION_FAILED');
    expect(mocks.finish).not.toHaveBeenCalled();
  });
  it('does not publish before a rejected or uncertain transaction commit', async () => {
    mocks.issue.mockImplementation(async (persist: (value: string) => Promise<void>) => {
      await persist(receipt);
      throw new Error('commit outcome unavailable');
    });
    await expect(runReadonlySmokeCommand(args)).rejects.toThrow('ISSUANCE_FAILED');
    expect(mocks.token).not.toHaveBeenCalled();
    expect(mocks.revoke).toHaveBeenCalledWith(receipt);
  });
  it('keeps cancellation unsuccessful even when cleanup succeeds', async () => {
    const controller = new AbortController();
    mocks.issue.mockImplementation(async (persist: (value: string) => Promise<void>) => {
      await persist(receipt);
      controller.abort();
      return { token };
    });
    await expect(runReadonlySmokeCommand(args, controller.signal)).rejects.toThrow('CANCELLED');
    expect(mocks.token).not.toHaveBeenCalled();
    expect(mocks.revoke).toHaveBeenCalledWith(receipt);
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });
  it('does not touch files or services when inputs or target are invalid', async () => {
    await expect(runReadonlySmokeCommand([...args, '--lifetime', '86400'])).rejects.toThrow();
    expect(mocks.directory).not.toHaveBeenCalled();
    expect(mocks.issue).not.toHaveBeenCalled();
    expect(mocks.revoke).not.toHaveBeenCalled();
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });
  it('surfaces disconnect failures and still attempts both disconnects', async () => {
    mocks.disconnect.mockRejectedValue(new Error('disconnect failed'));
    await expect(runReadonlySmokeCommand(args)).rejects.toThrow('DISCONNECT_FAILED');
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it('rejects missing cleanup receipts without inventing successful revocation', async () => {
    mocks.read.mockRejectedValue(new Error('missing receipt'));
    await expect(runReadonlySmokeCommand(['revoke', ...args.slice(1)])).rejects.toThrow();
    expect(mocks.revoke).not.toHaveBeenCalled();
    expect(mocks.finish).not.toHaveBeenCalled();
  });
});
