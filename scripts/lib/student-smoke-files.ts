import { constants } from 'node:fs';
import { open, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { publishSmokeToken, readSmokeToken, removeSmokeToken } from './readonly-smoke-files';
import { logoutStudent, type StudentReceipt } from './student-smoke-login';

const phaseSchema = z.enum(['prepared', 'request-started', 'revoked']);
type Phase = z.infer<typeof phaseSchema>;

async function state(directory: string, phase: Phase) {
  const next = join(directory, 'state.next');
  const file = await open(
    next,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await file.writeFile(phase, 'utf8');
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(next, join(directory, 'state'));
  const folder = await open(
    directory,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  );
  try {
    await folder.sync();
  } finally {
    await folder.close();
  }
}

export async function studentReceipt(directory: string): Promise<StudentReceipt> {
  // Directory creation/ownership is validated by privateSmokeDirectory before
  // this adapter is constructed. A fresh, exclusive directory cannot be reused.
  await state(directory, 'prepared');
  return {
    starting: () => state(directory, 'request-started'),
    token: (value) => publishSmokeToken(directory, value),
    revoked: () => state(directory, 'revoked'),
  };
}

export async function cleanupStudentReceipt(
  directory: string,
  revoke: typeof logoutStudent = logoutStudent,
): Promise<void> {
  const file = await open(join(directory, 'state'), constants.O_RDONLY | constants.O_NOFOLLOW);
  let phase: Phase;
  try {
    const stat = await file.stat();
    if (
      !stat.isFile() ||
      stat.nlink !== 1 ||
      stat.uid !== process.getuid?.() ||
      (stat.mode & 0o777) !== 0o600 ||
      stat.size > 32
    )
      throw new Error('STUDENT_RECEIPT_REJECTED');
    phase = phaseSchema.parse(await file.readFile('utf8'));
  } finally {
    await file.close();
  }
  const token = await readSmokeToken(directory);
  if (phase === 'request-started') {
    if (!token) throw new Error('STUDENT_CLEANUP_UNRESOLVED');
    await revoke(token);
    await state(directory, 'revoked');
  } else if (phase === 'prepared' && token) {
    throw new Error('STUDENT_RECEIPT_REJECTED');
  }
  await removeSmokeToken(directory);
  // Keep a non-secret receipt for idempotent always() cleanup, never a bearer.
  if (phase === 'prepared') await state(directory, 'revoked');
}
