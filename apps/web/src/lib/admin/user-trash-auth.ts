import { Prisma } from '@prisma/client';

/** Backups predate AuthSession; missing historical versions start beyond the default zero. */
export function restoredUserData(value: unknown, userId: string): Prisma.UserUncheckedCreateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid user backup');
  }
  const saved = value as Record<string, unknown>;
  if (typeof userId !== 'string' || !userId || saved.id !== userId) {
    throw new Error('Backup user identity mismatch');
  }
  const version = Object.hasOwn(saved, 'authVersion') ? saved.authVersion : 0;
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < 0 ||
    version >= 2147483647
  ) {
    throw new Error('Invalid or exhausted backup auth version');
  }
  // Only scalars can be restored: nested creates must never recreate sessions or reset tokens.
  const scalarFields = new Set<string>(Object.values(Prisma.UserScalarFieldEnum));
  const scalars = Object.fromEntries(
    Object.entries(saved).filter(([key]) => scalarFields.has(key)),
  );
  return { ...scalars, id: userId, authVersion: version + 1, legacyRevoked: true };
}
