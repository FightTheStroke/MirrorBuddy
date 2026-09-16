// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { chmod, lstat, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { privateSmokeDirectory, readSmokeToken } from '../lib/readonly-smoke-files';
import { cleanupStudentReceipt, studentReceipt } from '../lib/student-smoke-files';

const token = `s2:${'a'.repeat(43)}.${'b'.repeat(64)}`;
const created: string[] = [];
async function directory() {
  const root = await realpath(tmpdir());
  const path = join(root, `readonly-smoke-student-${randomUUID()}`);
  created.push(path);
  return privateSmokeDirectory({
    action: 'issue',
    target: 'synthetic',
    directory: path,
    temporaryRoot: root,
  });
}
afterEach(async () => {
  for (const path of created.splice(0)) await rm(path, { recursive: true, force: true });
});
describe('private student cleanup receipts', () => {
  it('records intent before login, stores a private native cookie and only removes it after logout', async () => {
    const path = await directory();
    const receipt = await studentReceipt(path);
    await receipt.starting();
    await receipt.token(token);
    expect((await lstat(join(path, 'token'))).mode & 0o777).toBe(0o600);
    expect((await lstat(join(path, 'state'))).mode & 0o777).toBe(0o600);
    expect(await readSmokeToken(path)).toBe(token);
    const revoke = vi.fn().mockResolvedValue(undefined);
    await cleanupStudentReceipt(path, revoke);
    expect(revoke).toHaveBeenCalledExactlyOnceWith(token);
    expect(await readSmokeToken(path)).toBeUndefined();
    expect(await readFile(join(path, 'state'), 'utf8')).toBe('revoked');
    await cleanupStudentReceipt(path, revoke);
    expect(revoke).toHaveBeenCalledOnce();
  });
  it('does not claim cleanup when a login request might have issued an unreceived session', async () => {
    const path = await directory();
    const receipt = await studentReceipt(path);
    await receipt.starting();
    const revoke = vi.fn();
    await expect(cleanupStudentReceipt(path, revoke)).rejects.toThrow('STUDENT_CLEANUP_UNRESOLVED');
    expect(revoke).not.toHaveBeenCalled();
    expect(await readFile(join(path, 'state'), 'utf8')).toBe('request-started');
  });
  it('leaves the receipt and token retryable after logout failure', async () => {
    const path = await directory();
    const receipt = await studentReceipt(path);
    await receipt.starting();
    await receipt.token(token);
    const revoke = vi
      .fn()
      .mockRejectedValueOnce(new Error('logout failed'))
      .mockResolvedValueOnce(undefined);
    await expect(cleanupStudentReceipt(path, revoke)).rejects.toThrow();
    expect(await readSmokeToken(path)).toBe(token);
    await cleanupStudentReceipt(path, revoke);
    expect(await readSmokeToken(path)).toBeUndefined();
  });
  it('safely acknowledges failures before the login request without making a request', async () => {
    const path = await directory();
    await studentReceipt(path);
    const revoke = vi.fn();
    await cleanupStudentReceipt(path, revoke);
    expect(revoke).not.toHaveBeenCalled();
    expect(await readFile(join(path, 'state'), 'utf8')).toBe('revoked');
  });
  it('cleans a session already revoked during failed issuance', async () => {
    const path = await directory();
    const receipt = await studentReceipt(path);
    await receipt.starting();
    await receipt.token(token);
    await receipt.revoked();
    const revoke = vi.fn();
    await cleanupStudentReceipt(path, revoke);
    expect(revoke).not.toHaveBeenCalled();
    expect(await readSmokeToken(path)).toBeUndefined();
  });
  it('rejects readable or symlinked receipts and tokens without changing the target', async () => {
    const path = await directory();
    await studentReceipt(path);
    await chmod(join(path, 'state'), 0o644);
    await expect(cleanupStudentReceipt(path)).rejects.toThrow();
    await writeFile(join(path, 'unrelated'), token, { mode: 0o600 });
    await symlink(join(path, 'unrelated'), join(path, 'token'));
    await expect(readSmokeToken(path)).rejects.toThrow();
    expect(await readFile(join(path, 'unrelated'), 'utf8')).toBe(token);
  });
  it.each(['legacy.signature', '', 'x'.repeat(4096)])(
    'rejects malformed token receipt %j',
    async (value) => {
      const path = await directory();
      await writeFile(join(path, 'token'), value, { mode: 0o600 });
      await expect(readSmokeToken(path)).rejects.toThrow();
    },
  );
});
