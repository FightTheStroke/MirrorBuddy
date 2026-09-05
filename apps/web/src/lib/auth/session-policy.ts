import { z } from 'zod';
import { getSessionActivation } from '@/lib/auth/activation';
import type { SessionTokenResult } from '@/lib/auth/session-token';

type VerifiedCredential = Extract<SessionTokenResult, { valid: true }>;
type AuthorizedSession =
  | { kind: 'legacy'; legacyOrigin: true }
  | {
      kind: 'modern';
      handleHash: string;
      legacyOrigin: boolean;
      issuedAt: Date;
      expiresAt: Date;
    };
type DenialReason =
  | 'INVALID_TOKEN'
  | 'SESSION_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'USER_DISABLED'
  | 'SESSION_REVOKED'
  | 'VERSION_MISMATCH'
  | 'SESSION_NOT_YET_VALID'
  | 'SESSION_EXPIRED'
  | 'LEGACY_REVOKED'
  | 'LEGACY_EXPIRED';

export type SessionResolution =
  | { status: 'DENIED'; reason: DenialReason }
  | { status: 'NOT_ACTIVATED' }
  | {
      status: 'AUTHENTICATED';
      userId: string;
      userAuthVersion: number;
      session: AuthorizedSession;
      checkedAt: Date;
      validUntil: Date;
    };

export class SessionReadError extends Error {
  constructor(
    public readonly code: 'DATABASE_FAILURE' | 'INVALID_DATABASE_STATE',
    public readonly cause?: unknown,
  ) {
    super(
      code === 'DATABASE_FAILURE'
        ? 'Session database read failed'
        : 'Invalid session database state',
    );
    this.name = 'SessionReadError';
  }
}

const version = z.number().int().min(0).max(2_147_483_647);
const snapshotSchema = z.object({
  dbNow: z.date(),
  activationId: z.literal('global').nullable(),
  sessionActivatedAt: z.date().nullable(),
  userId: z.string().min(1).nullable(),
  userDisabled: z.boolean().nullable(),
  userAuthVersion: version.nullable(),
  userLegacyRevoked: z.boolean().nullable(),
  handleHash: z
    .string()
    .length(64)
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
  sessionUserId: z.string().min(1).nullable(),
  issuedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
  sessionAuthVersion: version.nullable(),
  legacyOrigin: z.boolean().nullable(),
});

function invalidState(): never {
  throw new SessionReadError('INVALID_DATABASE_STATE');
}
function denied(reason: DenialReason): SessionResolution {
  return { status: 'DENIED', reason };
}

/** Pure policy only: production callers must use resolveSessionToken to obtain DB state/time. */
export function evaluateSessionPolicy(
  credential: VerifiedCredential | null | undefined,
  snapshot: unknown,
): SessionResolution {
  if (
    !credential ||
    credential.valid !== true ||
    (credential.kind !== 'modern' && credential.kind !== 'legacy')
  ) {
    return denied('INVALID_TOKEN');
  }
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) invalidState();
  const row = parsed.data;
  if (row.activationId === null && row.sessionActivatedAt !== null) invalidState();
  if (
    row.userId === null &&
    [row.userDisabled, row.userAuthVersion, row.userLegacyRevoked].some((value) => value !== null)
  ) {
    invalidState();
  }
  if (
    row.handleHash === null &&
    [
      row.sessionUserId,
      row.issuedAt,
      row.expiresAt,
      row.revokedAt,
      row.sessionAuthVersion,
      row.legacyOrigin,
    ].some((value) => value !== null)
  ) {
    invalidState();
  }
  if (credential.kind === 'modern' && row.handleHash === null) return denied('SESSION_NOT_FOUND');
  if (credential.kind === 'legacy' && row.handleHash !== null) invalidState();
  if (row.userId === null) return denied('USER_NOT_FOUND');
  if (row.userDisabled === null || row.userAuthVersion === null || row.userLegacyRevoked === null) {
    invalidState();
  }
  if (row.userDisabled) return denied('USER_DISABLED');

  let session: AuthorizedSession = { kind: 'legacy', legacyOrigin: true };
  let validUntil: Date | undefined;
  if (credential.kind === 'modern') {
    if (
      row.handleHash === null ||
      row.issuedAt === null ||
      row.expiresAt === null ||
      row.sessionAuthVersion === null ||
      row.legacyOrigin === null ||
      row.sessionUserId !== row.userId ||
      row.handleHash !== credential.handleHash ||
      row.expiresAt.getTime() <= row.issuedAt.getTime()
    ) {
      invalidState();
    }
    if (row.revokedAt !== null) return denied('SESSION_REVOKED');
    if (row.sessionAuthVersion !== row.userAuthVersion) return denied('VERSION_MISMATCH');
    if (row.issuedAt > row.dbNow) return denied('SESSION_NOT_YET_VALID');
    if (row.dbNow >= row.expiresAt) return denied('SESSION_EXPIRED');
    session = {
      kind: 'modern',
      handleHash: row.handleHash,
      legacyOrigin: row.legacyOrigin,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
    };
    validUntil = row.expiresAt;
  } else if (row.userId !== credential.userId) {
    invalidState();
  }

  if (session.legacyOrigin) {
    // Raw legacy has no version claim; its revocation authority is this one-way family flag.
    if (row.userLegacyRevoked) return denied('LEGACY_REVOKED');
    const activation = getSessionActivation(row.sessionActivatedAt);
    if (activation.status === 'INVALID_ACTIVATION') invalidState();
    if (activation.status === 'NOT_ACTIVATED') return { status: 'NOT_ACTIVATED' };
    if (activation.activatedAt > row.dbNow) invalidState();
    if (row.dbNow >= activation.legacyDeadline) return denied('LEGACY_EXPIRED');
    if (!validUntil || activation.legacyDeadline < validUntil)
      validUntil = activation.legacyDeadline;
  }
  if (!validUntil) invalidState();
  return {
    status: 'AUTHENTICATED',
    userId: row.userId,
    userAuthVersion: row.userAuthVersion,
    session,
    checkedAt: row.dbNow,
    validUntil,
  };
}
