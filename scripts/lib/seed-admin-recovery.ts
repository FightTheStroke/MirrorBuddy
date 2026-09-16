import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { RecoveryError } from './readonly-recovery-diagnostics';
import { verifyPassword } from '../../apps/web/src/lib/auth/password';
import { READONLY_DISABLED_PASSWORD } from '../../apps/web/src/lib/auth/readonly-account';
import { invalidateAllSessions } from '../../apps/web/src/lib/auth/session-revocation';
import {
  sessionDatabaseNow,
  sessionTransaction,
} from '../../apps/web/src/lib/auth/session-transaction';

const accountSchema = z.object({
  id: z.string().min(1),
  emailHash: z.string().regex(/^[a-f0-9]{64}$/),
  role: z.enum(['ADMIN', 'ADMIN_READONLY']),
  disabled: z.literal(false),
  passwordHash: z.string(),
  mustChangePassword: z.boolean(),
  authVersion: z.number().int().min(0).max(2_147_483_646),
});
const bcryptHash = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;

export function recoveryAction(args: unknown): 'report' | 'convert' {
  if (Array.isArray(args) && (args.length === 0 || (args.length === 1 && args[0] === 'report')))
    return 'report';
  if (
    Array.isArray(args) &&
    args.length === 2 &&
    args[0] === 'convert' &&
    args[1] === 'CONVERT_READONLY'
  )
    return 'convert';
  throw new RecoveryError('ARGUMENTS_REJECTED');
}

/** Shared by normal seeding and the existing-only operator recovery. */
export async function resetSeedCredential(
  tx: Prisma.TransactionClient,
  userId: string,
  passwordHash: string,
  mustChangePassword: boolean,
): Promise<void> {
  await invalidateAllSessions(tx, userId, await sessionDatabaseNow(tx), {
    passwordHash,
    mustChangePassword,
  });
  await tx.passwordResetToken.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });
}

async function existingAccount(
  tx: Prisma.TransactionClient,
  email: string,
  role: 'ADMIN' | 'ADMIN_READONLY',
) {
  const emailHash = createHash('sha256').update(email).digest('hex');
  const lookup = {
    where: { OR: [{ emailHash }, { email }, { username: email.split('@')[0] }] },
    select: {
      id: true,
      emailHash: true,
      role: true,
      disabled: true,
      passwordHash: true,
      mustChangePassword: true,
      authVersion: true,
    },
  } satisfies Prisma.UserFindManyArgs;
  const matches = z
    .array(accountSchema)
    .length(1)
    .safeParse(await tx.user.findMany(lookup));
  const rejected = role === 'ADMIN' ? 'OWNER_REJECTED' : 'ACCOUNT_REJECTED';
  if (!matches.success) throw new RecoveryError(rejected);
  const account = matches.data[0];
  if (account.emailHash !== emailHash || account.role !== role) throw new RecoveryError(rejected);
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "User" WHERE "id" = ${account.id} FOR UPDATE
  `;
  if (!Array.isArray(locked) || locked.length !== 1 || locked[0]?.id !== account.id)
    throw new RecoveryError('ACCOUNT_CHANGED');
  const current = z
    .array(accountSchema)
    .length(1)
    .safeParse(await tx.user.findMany(lookup));
  if (!current.success || JSON.stringify(current.data[0]) !== JSON.stringify(account))
    throw new RecoveryError('ACCOUNT_CHANGED');
  return account;
}

export async function recoverReadonlyAccount(
  action: 'report' | 'convert',
  env: NodeJS.ProcessEnv | null | undefined,
): Promise<'CONVERSION_REQUIRED' | 'ALREADY_READY' | 'CONVERTED'> {
  if (!['report', 'convert'].includes(action)) throw new RecoveryError('ARGUMENTS_REJECTED');
  const parsed = z
    .object({
      ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
      ADMIN_PASSWORD: z.string().min(8),
      ADMIN_READONLY_EMAIL: z.string().trim().toLowerCase().email(),
    })
    .safeParse(env);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === 'ADMIN_PASSWORD') throw new RecoveryError('CONFIG_ADMIN_PASSWORD');
    if (field === 'ADMIN_READONLY_EMAIL') throw new RecoveryError('CONFIG_ADMIN_READONLY_EMAIL');
    throw new RecoveryError('CONFIG_ADMIN_EMAIL');
  }
  const config = parsed.data;
  if (config.ADMIN_EMAIL === config.ADMIN_READONLY_EMAIL)
    throw new RecoveryError('ACCOUNT_REJECTED');
  // The proof and the sole allowed change share one serializable transaction.
  // No owner reconciliation, creation, email rewrite, role change or enablement.
  return sessionTransaction(async (tx) => {
    const owner = await existingAccount(tx, config.ADMIN_EMAIL, 'ADMIN');
    if (
      owner.mustChangePassword ||
      !bcryptHash.test(owner.passwordHash) ||
      !(await verifyPassword(config.ADMIN_PASSWORD, owner.passwordHash))
    )
      throw new RecoveryError('OWNER_REJECTED');
    const readonly = await existingAccount(tx, config.ADMIN_READONLY_EMAIL, 'ADMIN_READONLY');
    if (readonly.id === owner.id) throw new RecoveryError('ACCOUNT_REJECTED');
    if (readonly.passwordHash === READONLY_DISABLED_PASSWORD) {
      if (!readonly.mustChangePassword) throw new RecoveryError('ACCOUNT_REJECTED');
      return 'ALREADY_READY';
    }
    if (!bcryptHash.test(readonly.passwordHash)) throw new RecoveryError('ACCOUNT_REJECTED');
    if (action === 'report') return 'CONVERSION_REQUIRED';
    await resetSeedCredential(tx, readonly.id, READONLY_DISABLED_PASSWORD, true);
    return 'CONVERTED';
  });
}
