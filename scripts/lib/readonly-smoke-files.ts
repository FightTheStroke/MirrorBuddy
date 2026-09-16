import { constants, type Stats } from 'node:fs';
import { lstat, mkdir, open, realpath, rename, rmdir, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import type { SmokeOptions } from './readonly-smoke-options';
import { SmokeCommandError } from './readonly-smoke-options';

export async function privateSmokeDirectory(options: SmokeOptions): Promise<string> {
  if (
    !options ||
    !['issue', 'revoke'].includes(options.action) ||
    !['synthetic', 'production'].includes(options.target) ||
    typeof options.directory !== 'string' ||
    !isAbsolute(options.directory) ||
    typeof options.temporaryRoot !== 'string' ||
    !isAbsolute(options.temporaryRoot) ||
    !/^readonly-smoke-[A-Za-z0-9_-]+$/.test(basename(options.directory)) ||
    typeof process.getuid !== 'function'
  )
    throw new SmokeCommandError('PRIVATE_FILES');
  const root = await realpath(options.temporaryRoot);
  if ((await realpath(dirname(options.directory))) !== root)
    throw new SmokeCommandError('PRIVATE_FILES');
  const directory = join(root, basename(options.directory));
  if (options.action === 'issue') await mkdir(directory, { mode: 0o700 });
  await assertDirectory(directory);
  return directory;
}

function privateStat(stat: Stats, directory = false) {
  if (
    typeof process.getuid !== 'function' ||
    stat.uid !== process.getuid() ||
    (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1) ||
    (stat.mode & 0o777) !== (directory ? 0o700 : 0o600)
  )
    throw new SmokeCommandError('PRIVATE_FILES');
}

async function assertDirectory(directory: string) {
  if (
    typeof directory !== 'string' ||
    !isAbsolute(directory) ||
    !/^readonly-smoke-[A-Za-z0-9_-]+$/.test(basename(directory)) ||
    (await realpath(directory)) !== directory
  )
    throw new SmokeCommandError('PRIVATE_FILES');
  privateStat(await lstat(directory), true);
}

function missing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

async function existingFile(path: string): Promise<boolean> {
  try {
    privateStat(await lstat(path));
    return true;
  } catch (error) {
    if (missing(error)) return false;
    throw error;
  }
}

async function writeExclusive(path: string, value: string) {
  const file = await open(
    path,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    privateStat(await file.stat());
    await file.writeFile(value, 'utf8');
    await file.sync();
  } finally {
    await file.close();
  }
}

export async function persistSmokeReceipt(directory: string, receipt: string): Promise<void> {
  await assertDirectory(directory);
  if (
    typeof receipt !== 'string' ||
    receipt.length > 2048 ||
    !/^rs1:[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(receipt)
  )
    throw new SmokeCommandError('PRIVATE_FILES');
  const target = join(directory, 'receipt');
  await existingFile(target);
  const temporary = join(directory, 'receipt.next');
  await writeExclusive(temporary, receipt);
  try {
    await rename(temporary, target);
    const folder = await open(
      directory,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    try {
      await folder.sync();
    } finally {
      await folder.close();
    }
  } finally {
    if (await existingFile(temporary)) await unlink(temporary);
  }
}
export async function publishSmokeToken(directory: string, token: string): Promise<void> {
  await assertDirectory(directory);
  if (typeof token !== 'string' || !/^s2:[A-Za-z0-9_-]{43}\.[a-f0-9]{64}$/.test(token))
    throw new SmokeCommandError('PRIVATE_FILES');
  await writeExclusive(join(directory, 'token'), token);
}
export async function readSmokeReceipt(directory: string): Promise<string> {
  await assertDirectory(directory);
  const file = await open(join(directory, 'receipt'), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    privateStat(stat);
    if (stat.size === 0 || stat.size > 2048) throw new SmokeCommandError('PRIVATE_FILES');
    return await file.readFile('utf8');
  } finally {
    await file.close();
  }
}
export async function readSmokeToken(directory: string): Promise<string | undefined> {
  await assertDirectory(directory);
  const path = join(directory, 'token');
  if (!(await existingFile(path))) return undefined;
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    privateStat(stat);
    if (stat.size > 128) throw new SmokeCommandError('PRIVATE_FILES');
    const token = await file.readFile('utf8');
    if (!/^s2:[A-Za-z0-9_-]{43}\.[a-f0-9]{64}$/.test(token))
      throw new SmokeCommandError('PRIVATE_FILES');
    return token;
  } finally {
    await file.close();
  }
}
export async function removeSmokeToken(directory: string): Promise<void> {
  await assertDirectory(directory);
  const token = join(directory, 'token');
  if (await existingFile(token)) await unlink(token);
}
export async function finishSmokeCleanup(directory: string): Promise<void> {
  await removeSmokeToken(directory);
  const receipt = join(directory, 'receipt');
  if (!(await existingFile(receipt))) throw new SmokeCommandError('PRIVATE_FILES');
  await unlink(receipt);
  await rmdir(directory);
}
