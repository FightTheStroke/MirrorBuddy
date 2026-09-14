// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { chmod, lstat, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  privateSmokeDirectory,
  persistSmokeReceipt,
  publishSmokeToken,
  readSmokeReceipt,
  removeSmokeToken,
  finishSmokeCleanup,
} from '../lib/readonly-smoke-files';

const created: string[] = [];
const receipt = `rs1:Zml4dHVyZQ.${'a'.repeat(64)}`;
const token = `s2:${'a'.repeat(43)}.${'b'.repeat(64)}`;
async function directory() {
  const root = await realpath(tmpdir());
  const path = join(root, `readonly-smoke-${randomUUID()}`);
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

describe('private per-run smoke files', () => {
  it('creates a private directory, atomically journals receipts and exclusively publishes a token', async () => {
    const path = await directory();
    expect((await lstat(path)).mode & 0o777).toBe(0o700);
    await persistSmokeReceipt(path, receipt);
    await persistSmokeReceipt(path, receipt);
    expect((await readSmokeReceipt(path)) === receipt).toBe(true);
    await publishSmokeToken(path, token);
    expect((await lstat(join(path, 'token'))).mode & 0o777).toBe(0o600);
    expect((await lstat(join(path, 'receipt'))).mode & 0o777).toBe(0o600);
    expect((await readFile(join(path, 'token'), 'utf8')) === token).toBe(true);
    await expect(publishSmokeToken(path, token)).rejects.toThrow();
    await removeSmokeToken(path);
    await removeSmokeToken(path);
    await expect(lstat(join(path, 'token'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await readSmokeReceipt(path)) === receipt).toBe(true);
    await finishSmokeCleanup(path);
    await expect(lstat(path)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('will not reuse another run directory or accept a non-private directory', async () => {
    const path = await directory();
    const options = {
      action: 'issue',
      target: 'synthetic',
      directory: path,
      temporaryRoot: await realpath(tmpdir()),
    };
    await expect(
      privateSmokeDirectory({ ...options, action: 'issue', target: 'synthetic' }),
    ).rejects.toThrow();
    await chmod(path, 0o755);
    await expect(
      privateSmokeDirectory({ ...options, action: 'revoke', target: 'synthetic' }),
    ).rejects.toThrow();
  });
  it('rejects a credential or receipt symlink instead of following it', async () => {
    const path = await directory();
    const outside = join(path, 'unrelated');
    await writeFile(outside, 'retained', { mode: 0o600 });
    await symlink(outside, join(path, 'token'));
    await expect(publishSmokeToken(path, token)).rejects.toThrow();
    await expect(removeSmokeToken(path)).rejects.toThrow();
    await symlink(outside, join(path, 'receipt'));
    await expect(readSmokeReceipt(path)).rejects.toThrow();
    expect(await readFile(outside, 'utf8')).toBe('retained');
  });
  it('rejects readable receipts, missing receipts and oversized files', async () => {
    const path = await directory();
    await expect(readSmokeReceipt(path)).rejects.toThrow();
    await persistSmokeReceipt(path, receipt);
    await chmod(join(path, 'receipt'), 0o644);
    await expect(readSmokeReceipt(path)).rejects.toThrow();
    await chmod(join(path, 'receipt'), 0o600);
    await writeFile(join(path, 'receipt'), 'x'.repeat(4096));
    await expect(readSmokeReceipt(path)).rejects.toThrow();
  });
  it('rejects paths outside the selected temporary root', async () => {
    await expect(
      privateSmokeDirectory({
        action: 'issue',
        target: 'synthetic',
        directory: '/readonly-smoke-unit',
        temporaryRoot: tmpdir(),
      }),
    ).rejects.toThrow();
  });
});
