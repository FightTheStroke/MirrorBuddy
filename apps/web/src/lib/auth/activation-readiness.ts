import 'server-only';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ApiError } from '@/lib/api/pipe';
import { getSessionActivation } from './activation';
import { SessionReadError } from './session-policy';
import { sessionTransaction } from './session-transaction';

const readinessRow = z.object({
  now: z.date(),
  sessionActivatedAt: z.date().nullable(),
  blockedAccounts: z.bigint().min(BigInt(0)).max(BigInt(Number.MAX_SAFE_INTEGER)),
});

async function inspectReadiness(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw`
    SELECT statement_timestamp() AS now, g."sessionActivatedAt",
      (SELECT count(*) FROM "User" u
       WHERE NOT u."disabled" AND NOT u."legacyRevoked"
         AND (
           u."passwordHash" IS NULL OR
           u."passwordHash" !~ '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$' OR
           (COALESCE(length(trim(u."username")), 0) = 0
             AND COALESCE(length(trim(u."email")), 0) = 0)
         )
         AND NOT EXISTS (
           SELECT 1 FROM "AuthSession" s WHERE s."userId" = u."id"
             AND NOT s."legacyOrigin" AND s."revokedAt" IS NULL
             AND s."authVersion" = u."authVersion" AND s."issuedAt" <= statement_timestamp()
             AND s."expiresAt" > COALESCE(g."sessionActivatedAt", statement_timestamp())
               + INTERVAL '604800 seconds'
         )
      ) AS "blockedAccounts"
    FROM (VALUES (1)) AS anchor(n)
    LEFT JOIN "GlobalConfig" g ON g.id = 'global'
  `;
  if (!Array.isArray(rows) || rows.length !== 1)
    throw new SessionReadError('INVALID_DATABASE_STATE');
  const parsed = readinessRow.safeParse(rows[0]);
  if (!parsed.success) throw new SessionReadError('INVALID_DATABASE_STATE');
  const { now, sessionActivatedAt, blockedAccounts } = parsed.data;
  const activation = getSessionActivation(sessionActivatedAt);
  if (
    activation.status === 'INVALID_ACTIVATION' ||
    (activation.status === 'ACTIVATED' && activation.activatedAt > now)
  )
    throw new SessionReadError('INVALID_DATABASE_STATE');
  return {
    ...activation,
    checkedAt: now,
    blockedAccounts: Number(blockedAccounts),
    canActivate: activation.status === 'NOT_ACTIVATED' && blockedAccounts === BigInt(0),
  };
}

export async function getSessionActivationReadiness() {
  return sessionTransaction(inspectReadiness);
}

/** Manual operator entry point only; never called by requests, boot or deployment. */
export async function activateSessionLifecycle() {
  return sessionTransaction(async (tx) => {
    const readiness = await inspectReadiness(tx);
    if (readiness.status === 'ACTIVATED') {
      return { activatedAt: readiness.activatedAt, legacyDeadline: readiness.legacyDeadline };
    }
    if (!readiness.canActivate)
      throw new ApiError('Activation blocked: unrecoverable legacy-only accounts remain', 409);
    await tx.globalConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', sessionActivatedAt: readiness.checkedAt },
      update: { sessionActivatedAt: readiness.checkedAt },
    });
    const activated = getSessionActivation(readiness.checkedAt);
    if (activated.status !== 'ACTIVATED') throw new SessionReadError('INVALID_DATABASE_STATE');
    return { activatedAt: activated.activatedAt, legacyDeadline: activated.legacyDeadline };
  });
}
