import 'server-only';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { hashPII } from '@/lib/security';
import { READONLY_DISABLED_PASSWORD } from './readonly-account';
import { insertSession } from './session-issuance';
import { sessionDatabaseNow, sessionTransaction } from './session-transaction';
import { revokeNativeSessionRow } from './session-row-revocation';
import {
  READONLY_SMOKE_SECONDS,
  readReadonlySmokeReceipt,
  signReadonlySmokeReceipt,
} from './readonly-smoke-receipt';

const accountSchema = z.object({
  id: z.string().min(1).max(128),
  emailHash: z.string().regex(/^[a-f0-9]{64}$/),
  role: z.literal(UserRole.ADMIN_READONLY),
  passwordHash: z.literal(READONLY_DISABLED_PASSWORD),
  disabled: z.literal(false),
  authVersion: z.number().int().min(0).max(2_147_483_647),
});
const rowSchema = z.object({
  userId: z.string(),
  handleHash: z.string(),
  authVersion: z.number().int(),
  issuedAt: z.date(),
  expiresAt: z.date(),
  legacyOrigin: z.literal(false),
  revokedAt: z.date().nullable(),
});

async function configuredEmailHash(): Promise<string> {
  const email = process.env.ADMIN_READONLY_EMAIL;
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) throw new Error('Configured readonly identity is required');
  return hashPII(parsed.data);
}

export async function issueReadonlySmokeSession(
  persistReceipt: (receipt: string) => Promise<void>,
): Promise<{ token: string }> {
  if (typeof persistReceipt !== 'function') throw new Error('Receipt persistence is required');
  const emailHash = await configuredEmailHash();
  return sessionTransaction(async (tx) => {
    const users = await tx.user.findMany({
      where: { emailHash },
      take: 2,
      select: {
        id: true,
        emailHash: true,
        role: true,
        passwordHash: true,
        disabled: true,
        authVersion: true,
      },
    });
    const parsed = accountSchema.safeParse(
      Array.isArray(users) && users.length === 1 ? users[0] : null,
    );
    if (!parsed.success || parsed.data.emailHash !== emailHash)
      throw new Error(
        'Existing enabled readonly account with the disabled-password marker is required',
      );
    const issued = await insertSession(tx, parsed.data, READONLY_SMOKE_SECONDS);
    const receipt = signReadonlySmokeReceipt({
      handleHash: issued.handleHash,
      userId: issued.userId,
      emailHash,
      authVersion: parsed.data.authVersion,
      issuedAt: issued.issuedAt.toISOString(),
      expiresAt: issued.expiresAt.toISOString(),
    });
    // Journal before commit: cancellation after commit must retain scoped cleanup authority.
    await persistReceipt(receipt);
    return { token: issued.token };
  });
}

export async function revokeReadonlySmokeSession(
  receipt: unknown,
): Promise<{ status: 'revoked' | 'already-revoked' | 'absent' }> {
  const reference = readReadonlySmokeReceipt(receipt);
  if (reference.emailHash !== (await configuredEmailHash()))
    throw new Error('Readonly smoke receipt does not match the configured identity');
  return sessionTransaction(async (tx) => {
    const row = await tx.authSession.findUnique({
      where: { handleHash: reference.handleHash },
      select: {
        userId: true,
        handleHash: true,
        authVersion: true,
        issuedAt: true,
        expiresAt: true,
        legacyOrigin: true,
        revokedAt: true,
      },
    });
    if (row === null) return { status: 'absent' };
    const parsed = rowSchema.safeParse(row);
    if (
      !parsed.success ||
      parsed.data.userId !== reference.userId ||
      parsed.data.handleHash !== reference.handleHash ||
      parsed.data.authVersion !== reference.authVersion ||
      parsed.data.issuedAt.toISOString() !== reference.issuedAt ||
      parsed.data.expiresAt.toISOString() !== reference.expiresAt
    )
      throw new Error('Readonly smoke session no longer matches its receipt');
    if (parsed.data.revokedAt !== null) return { status: 'already-revoked' };
    const count = await revokeNativeSessionRow(
      tx,
      reference.userId,
      reference.handleHash,
      await sessionDatabaseNow(tx),
    );
    if (count !== 1) throw new Error('Readonly smoke revocation was not confirmed');
    return { status: 'revoked' };
  });
}
