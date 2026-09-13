export type SessionActivation =
  | { status: 'NOT_ACTIVATED' }
  | { status: 'INVALID_ACTIVATION' }
  | { status: 'ACTIVATED'; activatedAt: Date; legacyDeadline: Date };

const LEGACY_GRACE_MS = 604_800 * 1_000;

/** Interpret persisted activation only; never substitute a process or client clock. */
export function getSessionActivation(value: unknown): SessionActivation {
  if (value === null || value === undefined) return { status: 'NOT_ACTIVATED' };
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    return { status: 'INVALID_ACTIVATION' };
  }
  const legacyDeadline = new Date(value.getTime() + LEGACY_GRACE_MS);
  if (!Number.isFinite(legacyDeadline.getTime())) return { status: 'INVALID_ACTIVATION' };
  return { status: 'ACTIVATED', activatedAt: new Date(value.getTime()), legacyDeadline };
}
