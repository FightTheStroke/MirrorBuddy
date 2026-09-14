// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { lstat, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  storedRow,
  transport,
} from '../../apps/web/src/lib/auth/__tests__/readonly-smoke-fixtures';
import { parseSessionToken } from '../../apps/web/src/lib/auth/session-token';
import { runReadonlySmokeCommand } from '../lib/readonly-smoke-command';

let directory = '';
const args = (action: string) => [action, '--target', 'synthetic', '--directory', directory];
beforeEach(() => {
  directory = join(tmpdir(), `readonly-smoke-${randomUUID()}`);
  const local = 'postgresql://fixture@127.0.0.1:5432/mirrorbuddy_remediation_47ba2c29';
  vi.stubEnv('DATABASE_URL', local);
  vi.stubEnv('DIRECT_URL', local);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('E2E_TESTS', '');
  vi.stubEnv('VERCEL', '');
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe('actual command, private files and auth services with only Prisma transport mocked', () => {
  it('privately delivers a native credential and removes it only through receipt-bound cleanup', async () => {
    await runReadonlySmokeCommand(args('issue'));
    const token = await readFile(join(directory, 'token'), 'utf8');
    const receipt = await readFile(join(directory, 'receipt'), 'utf8');
    const parsed = parseSessionToken(token);
    expect(parsed.valid && parsed.kind === 'modern').toBe(true);
    expect(parseSessionToken(receipt).valid).toBe(false);
    expect((await lstat(join(directory, 'token'))).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(transport.create.mock.calls).includes(token)).toBe(false);

    transport.findSession.mockResolvedValue(storedRow());
    await runReadonlySmokeCommand(args('revoke'));

    expect(transport.revoke).toHaveBeenCalledOnce();
    expect(transport.accountWrite).not.toHaveBeenCalled();
    expect(transport.disconnect).toHaveBeenCalledTimes(2);
    expect(transport.end).toHaveBeenCalledTimes(2);
    await expect(lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('retains a usable private receipt but removes the bearer on actual cleanup failure', async () => {
    await runReadonlySmokeCommand(args('issue'));
    transport.findSession.mockResolvedValue(storedRow());
    transport.revoke.mockRejectedValue(new Error('synthetic write failure'));

    await expect(runReadonlySmokeCommand(args('revoke'))).rejects.toThrow('REVOCATION_FAILED');

    await expect(lstat(join(directory, 'token'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await lstat(join(directory, 'receipt'))).mode & 0o777).toBe(0o600);
    transport.revoke.mockResolvedValue({ count: 1 });
    await runReadonlySmokeCommand(args('revoke'));
    await expect(lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
